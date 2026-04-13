import { redis, KEYS, TTL } from '../config/redis';
import { prisma } from '../config/database';

export class PresenceService {
  async setOnline(userId: string, socketId: string): Promise<void> {
    const multi = redis.multi();
    multi.set(KEYS.presence(userId), 'online', 'EX', TTL.PRESENCE);
    multi.sadd(KEYS.userSockets(userId), socketId);
    multi.expire(KEYS.userSockets(userId), TTL.PRESENCE);
    multi.set(KEYS.socketUser(socketId), userId, 'EX', TTL.PRESENCE);
    await multi.exec();

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });
  }

  async setOffline(userId: string, socketId: string): Promise<void> {
    await redis.srem(KEYS.userSockets(userId), socketId);
    const remaining = await redis.scard(KEYS.userSockets(userId));

    if (remaining === 0) {
      const multi = redis.multi();
      multi.del(KEYS.presence(userId));
      multi.del(KEYS.userSockets(userId));
      await multi.exec();

      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });
    }

    await redis.del(KEYS.socketUser(socketId));
  }

  async heartbeat(userId: string): Promise<void> {
    await redis.expire(KEYS.presence(userId), TTL.PRESENCE);
  }

  async isOnline(userId: string): Promise<boolean> {
    const val = await redis.get(KEYS.presence(userId));
    return val !== null;
  }

  async getBulkPresence(userIds: string[]): Promise<Record<string, boolean>> {
    if (!userIds.length) return {};
    const pipeline = redis.pipeline();
    userIds.forEach(id => pipeline.exists(KEYS.presence(id)));
    const results = await pipeline.exec();
    return Object.fromEntries(userIds.map((id, i) => [id, (results?.[i]?.[1] as number) === 1]));
  }

  async getUserIdBySocket(socketId: string): Promise<string | null> {
    return redis.get(KEYS.socketUser(socketId));
  }

  async setTyping(chatId: string, userId: string): Promise<void> {
    await redis.set(KEYS.typing(chatId, userId), '1', 'EX', TTL.TYPING);
  }

  async clearTyping(chatId: string, userId: string): Promise<void> {
    await redis.del(KEYS.typing(chatId, userId));
  }

  async getTypingUsers(chatId: string): Promise<string[]> {
    const pattern = `typing:${chatId}:*`;
    const keys    = await redis.keys(pattern);
    return keys.map(k => k.split(':')[2]);
  }
}

export const presenceService = new PresenceService();
