import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis, redisSubscriber } from '../config/redis';
import { verifyAccessToken } from '../utils/jwt';
import { presenceService }   from '../services/presence.service';
import { messageService }    from '../services/message.service';
import { chatService }       from '../services/chat.service';
import { prisma }            from '../config/database';
import { logger }            from '../utils/logger';
import { env }               from '../config/env';

// ── Event type definitions ───────────────────────────────────────
export interface ServerToClientEvents {
  'message:new':        (msg: any) => void;
  'message:updated':    (msg: any) => void;
  'message:deleted':    (data: { messageId: string; chatId: string }) => void;
  'message:delivered':  (data: { messageId: string; userId: string }) => void;
  'message:read':       (data: { messageIds: string[]; chatId: string; userId: string }) => void;
  'typing:start':       (data: { chatId: string; userId: string; displayName: string }) => void;
  'typing:stop':        (data: { chatId: string; userId: string }) => void;
  'presence:update':    (data: { userId: string; isOnline: boolean; lastSeen?: string }) => void;
  'chat:created':       (chat: any) => void;
  'chat:updated':       (chat: any) => void;
  'chat:member_added':  (data: { chatId: string; users: any[] }) => void;
  'chat:member_removed':(data: { chatId: string; userId: string }) => void;
  'notification:new':   (notif: any) => void;
  'error':              (data: { message: string; code: number }) => void;
}

export interface ClientToServerEvents {
  'message:send':    (data: MessageSendPayload,   ack: AckFn) => void;
  'message:edit':    (data: MessageEditPayload,   ack: AckFn) => void;
  'message:delete':  (data: { messageId: string },ack: AckFn) => void;
  'message:read':    (data: MessageReadPayload,   ack: AckFn) => void;
  'typing:start':    (data: { chatId: string }) => void;
  'typing:stop':     (data: { chatId: string }) => void;
  'chat:join':       (data: { chatId: string }) => void;
  'chat:leave':      (data: { chatId: string }) => void;
  'presence:heartbeat': () => void;
}

type AckFn   = (res: { success: boolean; data?: any; error?: string }) => void;
interface MessageSendPayload  { chatId: string; content?: string; type?: string; replyToId?: string; mediaIds?: string[]; tempId?: string }
interface MessageEditPayload  { messageId: string; content: string }
interface MessageReadPayload  { chatId: string; messageIds: string[] }

interface AuthSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId:      string;
  username:    string;
  displayName: string;
}

export const initSocketServer = (httpServer: HttpServer) => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin:      env.CLIENT_URL,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout:  20000,
    pingInterval: 25000,
    transports:   ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling
  io.adapter(createAdapter(redis, redisSubscriber));

  // ── Auth middleware ───────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ??
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ??
        socket.handshake.query?.token as string;

      if (!token) return next(new Error('Authentication required'));

      const payload = verifyAccessToken(token);
      const user    = await prisma.user.findUnique({
        where:  { id: payload.sub },
        select: { id: true, username: true, displayName: true },
      });

      if (!user) return next(new Error('User not found'));

      (socket as AuthSocket).userId      = user.id;
      (socket as AuthSocket).username    = user.username;
      (socket as AuthSocket).displayName = user.displayName;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthSocket;
    const { userId, displayName } = socket;

    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // ── Join user's chats on connect ─────────────────────────
    try {
      const chats = await chatService.getUserChats(userId);
      const rooms = chats.map(c => c.id);
      await socket.join([userId, ...rooms]); // personal room + all chat rooms

      await presenceService.setOnline(userId, socket.id);

      // Broadcast presence to contacts
      io.to(rooms).emit('presence:update', { userId, isOnline: true });
    } catch (err) {
      logger.error('Error on connect setup', err);
    }

    // ── message:send ─────────────────────────────────────────
    socket.on('message:send', async (data, ack) => {
      try {
        const message = await messageService.send({
          chatId:    data.chatId,
          senderId:  userId,
          content:   data.content,
          type:      data.type as any,
          replyToId: data.replyToId,
          mediaIds:  data.mediaIds,
        });

        // Emit to all room members (including sender for multi-device)
        io.to(data.chatId).emit('message:new', { ...message, tempId: data.tempId });

        // Create delivery receipts for online members
        const memberIds = await chatService.getChatParticipantIds(data.chatId);
        const presence  = await presenceService.getBulkPresence(memberIds.filter(id => id !== userId));

        for (const [memberId, online] of Object.entries(presence)) {
          if (online) {
            await messageService.markDelivered(message.id, memberId);
            socket.emit('message:delivered', { messageId: message.id, userId: memberId });
          }
        }

        ack({ success: true, data: message });
      } catch (err: any) {
        logger.error('message:send error', err);
        ack({ success: false, error: err.message });
      }
    });

    // ── message:edit ─────────────────────────────────────────
    socket.on('message:edit', async (data, ack) => {
      try {
        const message = await messageService.editMessage(data.messageId, userId, data.content);
        io.to(message.chatId).emit('message:updated', message);
        ack({ success: true, data: message });
      } catch (err: any) {
        ack({ success: false, error: err.message });
      }
    });

    // ── message:delete ───────────────────────────────────────
    socket.on('message:delete', async (data, ack) => {
      try {
        const message = await messageService.deleteMessage(data.messageId, userId);
        io.to(message.chatId).emit('message:deleted', { messageId: message.id, chatId: message.chatId });
        ack({ success: true });
      } catch (err: any) {
        ack({ success: false, error: err.message });
      }
    });

    // ── message:read ─────────────────────────────────────────
    socket.on('message:read', async (data, ack) => {
      try {
        await messageService.markRead(data.chatId, userId, data.messageIds);
        io.to(data.chatId).emit('message:read', {
          messageIds: data.messageIds,
          chatId:     data.chatId,
          userId,
        });
        ack({ success: true });
      } catch (err: any) {
        ack({ success: false, error: err.message });
      }
    });

    // ── typing:start ─────────────────────────────────────────
    socket.on('typing:start', async ({ chatId }) => {
      await presenceService.setTyping(chatId, userId);
      socket.to(chatId).emit('typing:start', { chatId, userId, displayName });
    });

    // ── typing:stop ──────────────────────────────────────────
    socket.on('typing:stop', async ({ chatId }) => {
      await presenceService.clearTyping(chatId, userId);
      socket.to(chatId).emit('typing:stop', { chatId, userId });
    });

    // ── chat:join (dynamic, e.g. new group) ──────────────────
    socket.on('chat:join', async ({ chatId }) => {
      await socket.join(chatId);
    });

    // ── presence:heartbeat ───────────────────────────────────
    socket.on('presence:heartbeat', async () => {
      await presenceService.heartbeat(userId);
    });

    // ── disconnect ───────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
      try {
        await presenceService.setOffline(userId, socket.id);

        const stillOnline = await presenceService.isOnline(userId);
        if (!stillOnline) {
          const chats = await chatService.getUserChats(userId);
          const rooms = chats.map(c => c.id);
          io.to(rooms).emit('presence:update', {
            userId,
            isOnline: false,
            lastSeen: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.error('Error on disconnect cleanup', err);
      }
    });
  });

  return io;
};
