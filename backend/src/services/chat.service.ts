import { ChatType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/response';

export class ChatService {
  async getOrCreateDirect(userAId: string, userBId: string) {
    // Find existing direct chat between these two users
    const existing = await prisma.chat.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: userAId } } },
          { participants: { some: { userId: userBId } } },
        ],
      },
      include: this._chatInclude(userAId),
    });

    if (existing) return existing;

    return prisma.chat.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [
            { userId: userAId, role: 'MEMBER' },
            { userId: userBId, role: 'MEMBER' },
          ],
        },
      },
      include: this._chatInclude(userAId),
    });
  }

  async createGroup(creatorId: string, name: string, memberIds: string[], description?: string) {
    if (memberIds.length < 2) throw new AppError('Group requires at least 2 members', 400);

    const allMembers = [...new Set([creatorId, ...memberIds])];

    return prisma.chat.create({
      data: {
        type: 'GROUP',
        name,
        description,
        participants: {
          create: allMembers.map(userId => ({
            userId,
            role: userId === creatorId ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: this._chatInclude(creatorId),
    });
  }

  async getUserChats(userId: string) {
    return prisma.chat.findMany({
      where: {
        participants: { some: { userId, isArchived: false } },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      include: this._chatInclude(userId),
    });
  }

  async getChatById(chatId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: this._chatInclude(userId),
    });

    if (!chat) throw new AppError('Chat not found', 404);
    const isMember = chat.participants.some(p => p.userId === userId);
    if (!isMember) throw new AppError('Not a member of this chat', 403);

    return chat;
  }

  async addMembers(chatId: string, requesterId: string, userIds: string[]) {
    const requester = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId: requesterId } },
    });
    if (!requester || !['OWNER', 'ADMIN'].includes(requester.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    return prisma.chatParticipant.createMany({
      data: userIds.map(userId => ({ chatId, userId, role: 'MEMBER' as const })),
      skipDuplicates: true,
    });
  }

  async removeMember(chatId: string, requesterId: string, targetUserId: string) {
    const requester = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId: requesterId } },
    });
    if (!requester || (requester.role !== 'OWNER' && requesterId !== targetUserId)) {
      throw new AppError('Insufficient permissions', 403);
    }

    return prisma.chatParticipant.delete({
      where: { chatId_userId: { chatId, userId: targetUserId } },
    });
  }

  async updateGroup(chatId: string, requesterId: string, data: { name?: string; description?: string }) {
    const requester = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId: requesterId } },
    });
    if (!requester || !['OWNER', 'ADMIN'].includes(requester.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    return prisma.chat.update({ where: { id: chatId }, data });
  }

  async getChatParticipantIds(chatId: string): Promise<string[]> {
    const participants = await prisma.chatParticipant.findMany({
      where: { chatId },
      select: { userId: true },
    });
    return participants.map(p => p.userId);
  }

  private _chatInclude(userId: string) {
    return {
      participants: {
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeen: true } },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        include: { sender: { select: { id: true, displayName: true } } },
      },
    } as const;
  }
}

export const chatService = new ChatService();
