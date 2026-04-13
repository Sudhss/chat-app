import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chat.service';
import { ok, created } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

const createGroupSchema = z.object({
  body: z.object({
    name:        z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    memberIds:   z.array(z.string()).min(2).max(200),
  }),
});

const addMembersSchema = z.object({
  body:   z.object({ userIds: z.array(z.string()).min(1) }),
  params: z.object({ chatId: z.string() }),
});

export class ChatController {
  async getMyChats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const chats = await chatService.getUserChats(req.user!.sub);
      ok(res, chats);
    } catch (err) { next(err); }
  }

  async getChatById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const chat = await chatService.getChatById(req.params.chatId, req.user!.sub);
      ok(res, chat);
    } catch (err) { next(err); }
  }

  async openDirect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { targetUserId } = z.object({ body: z.object({ targetUserId: z.string() }) }).parse({ body: req.body }).body;
      const chat = await chatService.getOrCreateDirect(req.user!.sub, targetUserId);
      ok(res, chat);
    } catch (err) { next(err); }
  }

  async createGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { body } = createGroupSchema.parse({ body: req.body });
      const chat     = await chatService.createGroup(req.user!.sub, body.name, body.memberIds, body.description);
      created(res, chat);
    } catch (err) { next(err); }
  }

  async addMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { body, params } = addMembersSchema.parse({ body: req.body, params: req.params });
      await chatService.addMembers(params.chatId, req.user!.sub, body.userIds);
      ok(res, { message: 'Members added' });
    } catch (err) { next(err); }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { chatId, userId } = req.params;
      await chatService.removeMember(chatId, req.user!.sub, userId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async updateGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schema = z.object({ body: z.object({ name: z.string().max(100).optional(), description: z.string().max(500).optional() }) });
      const { body } = schema.parse({ body: req.body });
      const chat     = await chatService.updateGroup(req.params.chatId, req.user!.sub, body);
      ok(res, chat);
    } catch (err) { next(err); }
  }
}

export const chatController = new ChatController();
