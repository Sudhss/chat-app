import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { ok, created } from '../utils/response';

const registerSchema = z.object({
  body: z.object({
    email:       z.string().email(),
    username:    z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
    displayName: z.string().min(1).max(50),
    password:    z.string().min(8).max(128),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email:    z.string().email(),
    password: z.string().min(1),
  }),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { body } = registerSchema.parse({ body: req.body });
      const result   = await authService.register(body);
      this._setTokenCookies(res, result.accessToken, result.refreshToken);
      created(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) { next(err); }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { body } = loginSchema.parse({ body: req.body });
      const result   = await authService.login(body);
      this._setTokenCookies(res, result.accessToken, result.refreshToken);
      ok(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) { next(err); }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refresh_token ?? req.body?.refreshToken;
      if (!token) { res.status(401).json({ success: false, error: { message: 'No refresh token', code: 401 } }); return; }
      const result = await authService.refresh(token);
      this._setTokenCookies(res, result.accessToken, result.refreshToken);
      ok(res, { accessToken: result.accessToken });
    } catch (err) { next(err); }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refresh_token;
      await authService.logout(token);
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async me(req: any, res: Response, next: NextFunction) {
    try {
      ok(res, req.user?.dbUser ?? req.user);
    } catch (err) { next(err); }
  }

  private _setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const secure   = process.env.NODE_ENV === 'production';
    const sameSite = 'lax' as const;
    res.cookie('access_token', accessToken, {
      httpOnly: true, secure, sameSite, maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, secure, sameSite, maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });
  }
}

export const authController = new AuthController();
