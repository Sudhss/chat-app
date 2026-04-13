import { MessageType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/response';

export interface SendMessageDto {
  chatId:    string;
  senderId:  string;
  content?:  string;
  type?:     MessageType;
  replyToId?: string;
  mediaIds?: string[];
}

export class MessageService {
  async send(dto: SendMessageDto) {
    // Verify sender is participant
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId: dto.chatId, userId: dto.senderId } },
    });
    if (!participant) throw new AppError('Not a member of this chat', 403);

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          chatId:    dto.chatId,
          senderId:  dto.senderId,
          content:   dto.content,
          type:      dto.type ?? 'TEXT',
          replyToId: dto.replyToId,
          ...(dto.mediaIds?.length ? { media: { connect: dto.mediaIds.map(id => ({ id })) } } : {}),
        },
        include: {
          sender:  { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          replyTo: { select: { id: true, content: true, sender: { select: { displayName: true } } } },
          media:   true,
        },
      });

      // Update chat lastMessageAt
      await tx.chat.update({
        where: { id: dto.chatId },
        data: { lastMessageAt: msg.createdAt },
      });

      // Increment unread for all OTHER participants
      await tx.chatParticipant.updateMany({
        where: { chatId: dto.chatId, userId: { not: dto.senderId } },
        data: { unreadCount: { increment: 1 } },
      });

      return msg;
    });

    return message;
  }

  async getMessages(chatId: string, userId: string, cursor?: string, limit = 40) {
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!participant) throw new AppError('Not a member of this chat', 403);

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        sender:  { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        replyTo: { select: { id: true, content: true, sender: { select: { displayName: true } } } },
        media:   true,
        receipts: { where: { userId: { not: userId } }, select: { userId: true, deliveredAt: true, readAt: true } },
      },
    });

    const hasMore = messages.length > limit;
    const data    = hasMore ? messages.slice(0, limit) : messages;

    return { messages: data.reverse(), hasMore, nextCursor: hasMore ? data[0]?.createdAt.toISOString() : null };
  }

  async markDelivered(messageId: string, userId: string) {
    return prisma.messageReceipt.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, deliveredAt: new Date() },
      update: { deliveredAt: new Date() },
    });
  }

  async markRead(chatId: string, userId: string, messageIds: string[]) {
    const now = new Date();

    await prisma.$transaction([
      prisma.messageReceipt.createMany({
        data: messageIds.map(messageId => ({ messageId, userId, readAt: now, deliveredAt: now })),
        skipDuplicates: true,
      }),
      prisma.messageReceipt.updateMany({
        where: { messageId: { in: messageIds }, userId, readAt: null },
        data: { readAt: now },
      }),
      prisma.chatParticipant.update({
        where: { chatId_userId: { chatId, userId } },
        data: { lastReadAt: now, unreadCount: 0 },
      }),
    ]);
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new AppError('Message not found', 404);
    if (message.senderId !== userId) throw new AppError('Cannot delete another user\'s message', 403);

    return prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: null },
    });
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new AppError('Message not found', 404);
    if (message.senderId !== userId) throw new AppError('Cannot edit another user\'s message', 403);
    if (message.deletedAt) throw new AppError('Cannot edit deleted message', 400);

    return prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }
}

export const messageService = new MessageService();
