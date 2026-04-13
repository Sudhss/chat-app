import { Router } from 'express';
import { authController }    from '../controllers/auth.controller';
import { chatController }    from '../controllers/chat.controller';
import { messageController } from '../controllers/message.controller';
import { userController }    from '../controllers/user.controller';
import { mediaService }      from '../services/media.service';
import { authenticate, requireUser } from '../middleware/auth.middleware';
import { ok } from '../utils/response';
import { z } from 'zod';
import { AppError } from '../utils/response';

const router = Router();

// ── Health ──────────────────────────────────────────────────────
router.get('/health', (_req, res) => ok(res, { status: 'ok', ts: new Date().toISOString() }));

// ── Auth ─────────────────────────────────────────────────────────
const auth = Router();
auth.post('/register',   authController.register.bind(authController));
auth.post('/login',      authController.login.bind(authController));
auth.post('/refresh',    authController.refresh.bind(authController));
auth.post('/logout',     authController.logout.bind(authController));
auth.get('/me',          authenticate, requireUser, authController.me.bind(authController));
router.use('/auth', auth);

// ── Users ─────────────────────────────────────────────────────────
const users = Router();
users.use(authenticate);
users.get('/search',            userController.searchUsers.bind(userController));
users.post('/presence',         userController.getPresence.bind(userController));
users.get('/:userId',           userController.getProfile.bind(userController));
users.patch('/me',              requireUser, userController.updateProfile.bind(userController));
router.use('/users', users);

// ── Chats ─────────────────────────────────────────────────────────
const chats = Router();
chats.use(authenticate);
chats.get('/',                             chatController.getMyChats.bind(chatController));
chats.post('/direct',                      chatController.openDirect.bind(chatController));
chats.post('/group',                       chatController.createGroup.bind(chatController));
chats.get('/:chatId',                      chatController.getChatById.bind(chatController));
chats.patch('/:chatId',                    chatController.updateGroup.bind(chatController));
chats.post('/:chatId/members',             chatController.addMembers.bind(chatController));
chats.delete('/:chatId/members/:userId',   chatController.removeMember.bind(chatController));
router.use('/chats', chats);

// ── Messages ──────────────────────────────────────────────────────
const messages = Router({ mergeParams: true });
messages.use(authenticate);
messages.get('/',                           messageController.getMessages.bind(messageController));
messages.post('/',                          messageController.sendMessage.bind(messageController));
messages.patch('/:messageId',              messageController.editMessage.bind(messageController));
messages.delete('/:messageId',             messageController.deleteMessage.bind(messageController));
messages.post('/read',                     messageController.markRead.bind(messageController));
router.use('/chats/:chatId/messages', messages);

// ── Media ─────────────────────────────────────────────────────────
const media = Router();
media.use(authenticate);
media.post('/presign', async (req: any, res, next) => {
  try {
    const { filename, mimeType, size } = z.object({
      body: z.object({ filename: z.string(), mimeType: z.string(), size: z.number().positive() }),
    }).parse({ body: req.body }).body;
    const result = await mediaService.getPresignedUploadUrl(req.user.sub, filename, mimeType, size);
    ok(res, result);
  } catch (err) { next(err); }
});
media.get('/:mediaId/download', async (req: any, res, next) => {
  try {
    const { url, media: m } = await mediaService.getDownloadUrl(req.params.mediaId, req.user.sub);
    ok(res, { url, media: m });
  } catch (err) { next(err); }
});
router.use('/media', media);

export default router;
