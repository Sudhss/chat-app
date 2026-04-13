import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { messageService } from '../services/message.service';
import { ok, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

const sendSchema = z.object({
  body: z.object({
    content:   z.string().max(4000).optional(),
    type:      z.enum(['TEXT','IMAGE','FILE','AUDIO','VIDEO']).optional(),
    replyToId: z.string().optional(),
    mediaIds:  z.array(z.string()).optional(),
  }).refine(d => d.content || (d.mediaIds && d.mediaIds.length > 0), {
    message: 'Message must have content or media',
  }),
  params: z.object({ chatId: z.string() }),
});

export class MessageController {
  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { chatId } = req.params;
      const cursor = req.query.cursor as string | undefined;
      const limit  = Math.min(Number(req.query.limit ?? 40), 100);
      const result = await messageService.getMessages(chatId, req.user!.sub, cursor, limit);
      ok(res, result);
    } catch (err) { next(err); }
  }

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { body, params } = sendSchema.parse({ body: req.body, params: req.params });
      const message = await messageService.send({ ...body, chatId: params.chatId, senderId: req.user!.sub });
      created(res, message);
    } catch (err) { next(err); }
  }

  async editMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { content } = z.object({ body: z.object({ content: z.string().min(1).max(4000) }) }).parse({ body: req.body }).body;
      const message = await messageService.editMessage(req.params.messageId, req.user!.sub, content);
      ok(res, message);
    } catch (err) { next(err); }
  }

  async deleteMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await messageService.deleteMessage(req.params.messageId, req.user!.sub);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { chatId } = req.params;
      const { messageIds } = z.object({ body: z.object({ messageIds: z.array(z.string()) }) }).parse({ body: req.body }).body;
      await messageService.markRead(chatId, req.user!.sub, messageIds);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const messageController = new MessageController();
