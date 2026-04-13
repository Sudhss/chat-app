import { createServer } from 'http';
import app from './app';
import { initSocketServer } from './socket/index';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { env } from './config/env';
import { logger } from './utils/logger';

const httpServer = createServer(app);
const io         = initSocketServer(httpServer);

async function bootstrap() {
  try {
    // Verify DB connection
    await prisma.$connect();
    logger.info('PostgreSQL connected');

    // Verify Redis connection
    await redis.connect();
    logger.info('Redis connected');

    httpServer.listen(env.PORT, () => {
      logger.info(`Flux API running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`WebSocket server ready`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  httpServer.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (err) => { logger.error('Uncaught exception', err); process.exit(1); });
process.on('unhandledRejection', (err) => { logger.error('Unhandled rejection', err); process.exit(1); });

bootstrap();

export { io };
