import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import routes from './routes/index';
import { errorHandler, notFound } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();

// ── Security ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

app.use(cors({
  origin:      env.CLIENT_URL,
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Middleware ───────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

app.set('trust proxy', 1);

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth',  authLimiter);
app.use('/api',       apiLimiter, routes);

// ── Error handling ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
