import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/response';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.statusCode },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 400,
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    res.status(409).json({
      success: false,
      error: { message: 'Resource already exists', code: 409 },
    });
    return;
  }

  // Prisma not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      error: { message: 'Resource not found', code: 404 },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 500,
    },
  });
};

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
};
