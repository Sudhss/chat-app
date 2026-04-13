import { Response } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ok = <T>(res: Response, data: T, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

export const created = <T>(res: Response, data: T) =>
  res.status(201).json({ success: true, data });

export const paginated = <T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; limit: number; hasMore: boolean }
) => res.status(200).json({ success: true, data, meta });

export const noContent = (res: Response) => res.status(204).send();
