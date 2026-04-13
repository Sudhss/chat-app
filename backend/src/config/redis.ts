import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
});

export const redisSubscriber = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', err));

export const KEYS = {
  presence:       (userId: string) => `presence:${userId}`,
  typing:         (chatId: string, userId: string) => `typing:${chatId}:${userId}`,
  typingMembers:  (chatId: string) => `typing:${chatId}:*`,
  session:        (token: string) => `session:${token}`,
  rateLimit:      (ip: string) => `rate:${ip}`,
  unread:         (userId: string, chatId: string) => `unread:${userId}:${chatId}`,
  socketUser:     (socketId: string) => `socket:${socketId}`,
  userSockets:    (userId: string) => `usersockets:${userId}`,
} as const;

export const TTL = {
  PRESENCE:        300,   // 5 min – refreshed on heartbeat
  TYPING:          3,     // 3 sec auto-clear
  REFRESH_TOKEN:   30 * 24 * 60 * 60,
  SESSION:         15 * 60,
} as const;
