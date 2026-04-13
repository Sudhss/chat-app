import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'flux-api' },
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'development'
        ? combine(colorize(), simple())
        : combine(timestamp(), json()),
    }),
  ],
});
