import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt';
import { AppError } from '../utils/response';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: AccessTokenPayload & { dbUser?: { id: string; username: string; displayName: string; avatarUrl: string | null } };
}

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // Support both Authorization header and httpOnly cookie
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) throw new AppError('No access token provided', 401);

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') return next(new AppError('Access token expired', 401));
    if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid access token', 401));
    next(err);
  }
};

export const requireUser = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.user?.sub) throw new AppError('Unauthorized', 401);
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    if (!user) throw new AppError('User not found', 404);
    req.user.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.access_token;
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }
  } catch {
    // silent — optional auth doesn't fail
  }
  next();
};
