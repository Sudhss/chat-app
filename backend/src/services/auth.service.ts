import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { redis, KEYS, TTL } from '../config/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/response';
import { env } from '../config/env';

export interface RegisterDto {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export class AuthService {
  async register(dto: RegisterDto) {
    const [emailExists, usernameExists] = await Promise.all([
      prisma.user.findUnique({ where: { email: dto.email } }),
      prisma.user.findUnique({ where: { username: dto.username } }),
    ]);

    if (emailExists)    throw new AppError('Email already registered', 409);
    if (usernameExists) throw new AppError('Username already taken', 409);

    const passwordHash = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email:        dto.email,
        username:     dto.username.toLowerCase(),
        displayName:  dto.displayName,
        passwordHash,
      },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    return this._issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const { passwordHash: _, ...safeUser } = user;
    return this._issueTokens(safeUser);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      // Token reuse detected — revoke entire family
      await prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
      throw new AppError('Refresh token reused or expired', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true },
    });
    if (!user) throw new AppError('User not found', 404);

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    return this._issueTokens(user);
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
  }

  async googleCallback(googleId: string, email: string, displayName: string, avatarUrl?: string) {
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true },
    });

    if (!user) {
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + Math.random().toString(36).slice(2, 6);
      user = await prisma.user.create({
        data: { email, googleId, displayName, avatarUrl, username },
        select: { id: true, email: true, username: true, displayName: true, avatarUrl: true },
      });
    } else if (!user) {
      await prisma.user.update({ where: { id: user!.id }, data: { googleId } });
    }

    return this._issueTokens(user!);
  }

  private async _issueTokens(user: { id: string; email: string; username: string; displayName: string; avatarUrl?: string | null }) {
    const jti = uuidv4();
    const accessToken  = signAccessToken({ sub: user.id, email: user.email, username: user.username });
    const refreshToken = signRefreshToken({ sub: user.id, jti });

    const expiresAt = new Date(Date.now() + TTL.REFRESH_TOKEN * 1000);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    return { user, accessToken, refreshToken, cookieOptions };
  }
}

export const authService = new AuthService();
