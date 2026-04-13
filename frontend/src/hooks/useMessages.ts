'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '../store/chat.store';
import { useAuthStore } from '../store/auth.store';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useTyping } from './useSocket';
import toast from 'react-hot-toast';
import { PaginatedMessages } from '../types';

export const useMessages = (chatId: string | null) => {
  const { user } = useAuthStore();
  const {
    messages, hasMore, cursors,
    setMessages, prependMessages,
    addOptimisticMsg, confirmOptimistic, failOptimistic,
    resetUnread,
  } = useChatStore();

  const { startTyping, stopTyping } = useTyping(chatId);
  const loadingRef = useRef(false);

  // Load initial messages
  useEffect(() => {
    if (!chatId) return;
    loadMessages(chatId, false);
    resetUnread(chatId);
  }, [chatId]);

  const loadMessages = useCallback(async (cId: string, loadMore: boolean) => {
    if (loadingRef.current) return;
    if (loadMore && !hasMore[cId]) return;
    loadingRef.current = true;
    try {
      const cursor = loadMore ? cursors[cId] : undefined;
      const params: Record<string, any> = { limit: 40 };
      if (cursor) params.cursor = cursor;

      const { data } = await api.get<{ success: boolean; data: PaginatedMessages }>(
        `/chats/${cId}/messages`, { params }
      );
      const { messages: msgs, hasMore: more, nextCursor } = data.data;

      if (loadMore) prependMessages(cId, msgs, more, nextCursor);
      else          setMessages(cId, msgs, more, nextCursor);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      loadingRef.current = false;
    }
  }, [hasMore, cursors]);

  const loadMore = useCallback(() => {
    if (chatId) loadMessages(chatId, true);
  }, [chatId, loadMessages]);

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!chatId || !user || !content.trim()) return;
    const tempId = addOptimisticMsg(chatId, content, user.id);
    const socket = getSocket();
    stopTyping();

    socket.emit(
      'message:send',
      { chatId, content: content.trim(), replyToId, tempId },
      (response) => {
        if (response.success) {
          confirmOptimistic(chatId, tempId, { ...response.data!, tempId });
        } else {
          failOptimistic(chatId, tempId);
          toast.error('Failed to send message');
        }
      }
    );
  }, [chatId, user, stopTyping]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!chatId) return;
    const socket = getSocket();
    socket.emit('message:edit', { messageId, content }, (res) => {
      if (!res.success) toast.error('Failed to edit message');
    });
  }, [chatId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!chatId) return;
    const socket = getSocket();
    socket.emit('message:delete', { messageId }, (res) => {
      if (!res.success) toast.error('Failed to delete message');
    });
  }, [chatId]);

  const markRead = useCallback((messageIds: string[]) => {
    if (!chatId || !messageIds.length) return;
    getSocket().emit('message:read', { chatId, messageIds }, () => {});
    resetUnread(chatId);
  }, [chatId]);

  return {
    messages:    chatId ? (messages[chatId] ?? []) : [],
    hasMore:     chatId ? (hasMore[chatId] ?? false) : false,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    markRead,
    startTyping,
    stopTyping,
  };
};
