import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { presenceService } from '../services/presence.service';
import { ok } from '../utils/response';
import { AppError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

export class UserController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId ?? req.user!.sub;
      const user   = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, isOnline: true, lastSeen: true, createdAt: true },
      });
      if (!user) throw new AppError('User not found', 404);

      const isOnline = await presenceService.isOnline(userId);
      ok(res, { ...user, isOnline });
    } catch (err) { next(err); }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        body: z.object({
          displayName: z.string().min(1).max(50).optional(),
          bio:         z.string().max(200).optional(),
          avatarUrl:   z.string().url().optional(),
        }),
      });
      const { body } = schema.parse({ body: req.body });
      const user = await prisma.user.update({
        where: { id: req.user!.sub },
        data: body,
        select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
      });
      ok(res, user);
    } catch (err) { next(err); }
  }

  async searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { q } = z.object({ query: z.object({ q: z.string().min(1).max(50) }) }).parse({ query: req.query }).query;

      const users = await prisma.user.findMany({
        where: {
          AND: [
            { id: { not: req.user!.sub } },
            {
              OR: [
                { username:    { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
                { email:       { contains: q, mode: 'insensitive' } },
              ],
            },
          ],
        },
        select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true },
        take: 20,
      });

      const presenceMap = await presenceService.getBulkPresence(users.map(u => u.id));
      const result      = users.map(u => ({ ...u, isOnline: presenceMap[u.id] ?? false }));

      ok(res, result);
    } catch (err) { next(err); }
  }

  async getPresence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userIds } = z.object({ body: z.object({ userIds: z.array(z.string()).max(100) }) }).parse({ body: req.body }).body;
      const presence    = await presenceService.getBulkPresence(userIds);
      ok(res, presence);
    } catch (err) { next(err); }
  }
}

export const userController = new UserController();
