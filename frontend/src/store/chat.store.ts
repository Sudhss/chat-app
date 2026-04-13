import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Chat, Message, TypingUser } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ChatStore {
  chats:          Record<string, Chat>;
  messages:       Record<string, Message[]>;
  activeChatId:   string | null;
  typingUsers:    Record<string, TypingUser[]>;
  hasMore:        Record<string, boolean>;
  cursors:        Record<string, string | null>;
  unreadCounts:   Record<string, number>;

  // Actions
  setChats:           (chats: Chat[]) => void;
  upsertChat:         (chat: Chat) => void;
  setActiveChat:      (chatId: string | null) => void;
  setMessages:        (chatId: string, messages: Message[], hasMore: boolean, cursor: string | null) => void;
  prependMessages:    (chatId: string, messages: Message[], hasMore: boolean, cursor: string | null) => void;
  addMessage:         (message: Message) => void;
  updateMessage:      (messageId: string, update: Partial<Message>) => void;
  deleteMessage:      (chatId: string, messageId: string) => void;
  addOptimisticMsg:   (chatId: string, content: string, senderId: string, type?: string) => string;
  confirmOptimistic:  (chatId: string, tempId: string, message: Message) => void;
  failOptimistic:     (chatId: string, tempId: string) => void;
  setTyping:          (chatId: string, user: TypingUser) => void;
  clearTyping:        (chatId: string, userId: string) => void;
  markRead:           (chatId: string, userId: string, messageIds: string[]) => void;
  setPresence:        (userId: string, isOnline: boolean) => void;
  updateUnread:       (chatId: string, count: number) => void;
  resetUnread:        (chatId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  immer((set) => ({
    chats:        {},
    messages:     {},
    activeChatId: null,
    typingUsers:  {},
    hasMore:      {},
    cursors:      {},
    unreadCounts: {},

    setChats: (chats) => set((s) => {
      chats.forEach(c => { s.chats[c.id] = c; });
    }),

    upsertChat: (chat) => set((s) => { s.chats[chat.id] = chat; }),

    setActiveChat: (chatId) => set((s) => { s.activeChatId = chatId; }),

    setMessages: (chatId, messages, hasMore, cursor) => set((s) => {
      s.messages[chatId] = messages;
      s.hasMore[chatId]  = hasMore;
      s.cursors[chatId]  = cursor;
    }),

    prependMessages: (chatId, messages, hasMore, cursor) => set((s) => {
      const existing = s.messages[chatId] ?? [];
      s.messages[chatId] = [...messages, ...existing];
      s.hasMore[chatId]  = hasMore;
      s.cursors[chatId]  = cursor;
    }),

    addMessage: (message) => set((s) => {
      const list = s.messages[message.chatId];
      if (!list) { s.messages[message.chatId] = [message]; return; }
      // Remove optimistic duplicate
      const filtered = list.filter(m => !(m.pending && m.tempId === message.tempId));
      s.messages[message.chatId] = [...filtered, message];
      // Update last message in chat
      if (s.chats[message.chatId]) {
        s.chats[message.chatId].messages = [message];
        s.chats[message.chatId].lastMessageAt = message.createdAt;
      }
    }),

    updateMessage: (messageId, update) => set((s) => {
      for (const chatId of Object.keys(s.messages)) {
        const idx = s.messages[chatId].findIndex(m => m.id === messageId);
        if (idx !== -1) {
          s.messages[chatId][idx] = { ...s.messages[chatId][idx], ...update };
          return;
        }
      }
    }),

    deleteMessage: (chatId, messageId) => set((s) => {
      const list = s.messages[chatId];
      if (!list) return;
      const idx = list.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        s.messages[chatId][idx] = { ...s.messages[chatId][idx], deletedAt: new Date().toISOString(), content: undefined };
      }
    }),

    addOptimisticMsg: (chatId, content, senderId, type = 'TEXT') => {
      const tempId = `temp_${uuidv4()}`;
      set((s) => {
        const optimistic: Message = {
          id: tempId, chatId, senderId, content, type: type as any,
          status: 'SENDING', createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(), pending: true, tempId,
          sender: { id: senderId, username: '', displayName: '', avatarUrl: null },
        };
        if (!s.messages[chatId]) s.messages[chatId] = [];
        s.messages[chatId].push(optimistic);
      });
      return tempId;
    },

    confirmOptimistic: (chatId, tempId, message) => set((s) => {
      const list = s.messages[chatId];
      if (!list) return;
      const idx = list.findIndex(m => m.tempId === tempId);
      if (idx !== -1) s.messages[chatId][idx] = message;
    }),

    failOptimistic: (chatId, tempId) => set((s) => {
      const list = s.messages[chatId];
      if (!list) return;
      const idx = list.findIndex(m => m.tempId === tempId);
      if (idx !== -1) s.messages[chatId][idx] = { ...s.messages[chatId][idx], failed: true, pending: false };
    }),

    setTyping: (chatId, user) => set((s) => {
      if (!s.typingUsers[chatId]) s.typingUsers[chatId] = [];
      const exists = s.typingUsers[chatId].some(u => u.userId === user.userId);
      if (!exists) s.typingUsers[chatId].push(user);
    }),

    clearTyping: (chatId, userId) => set((s) => {
      if (!s.typingUsers[chatId]) return;
      s.typingUsers[chatId] = s.typingUsers[chatId].filter(u => u.userId !== userId);
    }),

    markRead: (chatId, userId, messageIds) => set((s) => {
      const list = s.messages[chatId];
      if (!list) return;
      list.forEach((m, i) => {
        if (messageIds.includes(m.id)) {
          s.messages[chatId][i].status = 'READ';
        }
      });
    }),

    setPresence: (userId, isOnline) => set((s) => {
      Object.values(s.chats).forEach(chat => {
        chat.participants.forEach((p, pi) => {
          if (p.userId === userId) {
            s.chats[chat.id].participants[pi].user.isOnline = isOnline;
          }
        });
      });
    }),

    updateUnread: (chatId, count) => set((s) => { s.unreadCounts[chatId] = count; }),
    resetUnread:  (chatId)        => set((s) => { s.unreadCounts[chatId] = 0; }),
  }))
);
