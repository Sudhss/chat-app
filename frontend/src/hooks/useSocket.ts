'use client';
import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useChatStore } from '../store/chat.store';
import { useAuthStore } from '../store/auth.store';
import { Message } from '../types';
import toast from 'react-hot-toast';

export const useSocketEvents = () => {
  const { isAuthenticated, user } = useAuthStore();
  const {
    addMessage, updateMessage, deleteMessage,
    setTyping, clearTyping, markRead, setPresence,
  } = useChatStore();
  const activeChatId = useChatStore(s => s.activeChatId);
  const boundRef     = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || boundRef.current) return;
    const socket = getSocket();
    boundRef.current = true;

    // ── message:new ────────────────────────────────────────────
    socket.on('message:new', (message: Message) => {
      addMessage(message);
      // Show toast if not in that chat
      if (message.senderId !== user?.id && message.chatId !== activeChatId) {
        toast(`${message.sender.displayName}: ${message.content?.slice(0, 50) ?? 'Sent an attachment'}`, {
          icon: '💬',
          duration: 3000,
          style: { background: '#1a1d27', color: '#e2e8f0', border: '1px solid #2e3148' },
        });
      }
    });

    // ── message:updated ─────────────────────────────────────────
    socket.on('message:updated', (message: Message) => {
      updateMessage(message.id, message);
    });

    // ── message:deleted ─────────────────────────────────────────
    socket.on('message:deleted', ({ messageId, chatId }) => {
      deleteMessage(chatId, messageId);
    });

    // ── message:delivered / read ─────────────────────────────────
    socket.on('message:delivered', ({ messageId }) => {
      updateMessage(messageId, { status: 'DELIVERED' });
    });

    socket.on('message:read', ({ messageIds, chatId, userId: readerId }) => {
      if (readerId !== user?.id) {
        markRead(chatId, readerId, messageIds);
      }
    });

    // ── typing ───────────────────────────────────────────────────
    socket.on('typing:start', ({ chatId, userId, displayName }) => {
      if (userId !== user?.id) setTyping(chatId, { chatId, userId, displayName });
    });

    socket.on('typing:stop', ({ chatId, userId }) => {
      clearTyping(chatId, userId);
    });

    // ── presence ──────────────────────────────────────────────────
    socket.on('presence:update', ({ userId, isOnline }) => {
      setPresence(userId, isOnline);
    });

    return () => {
      socket.off('message:new');
      socket.off('message:updated');
      socket.off('message:deleted');
      socket.off('message:delivered');
      socket.off('message:read');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('presence:update');
      boundRef.current = false;
    };
  }, [isAuthenticated]);
};

// ── useTyping — debounced typing indicator ────────────────────────
export const useTyping = (chatId: string | null) => {
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const startTyping = () => {
    if (!chatId) return;
    const socket = getSocket();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { chatId });
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { chatId });
    }, 2500);
  };

  const stopTyping = () => {
    if (!chatId || !isTypingRef.current) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTypingRef.current = false;
    getSocket().emit('typing:stop', { chatId });
  };

  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  return { startTyping, stopTyping };
};
