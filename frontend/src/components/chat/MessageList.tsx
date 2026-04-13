'use client';
import { useEffect, useRef, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { MessageBubble } from './MessageBubble';
import { Message } from '../../types';
import { useAuthStore } from '../../store/auth.store';

interface Props {
  messages:      Message[];
  hasMore:       boolean;
  loadMore:      () => void;
  onEdit:        (msg: Message) => void;
  onReply:       (msg: Message) => void;
  onDelete:      (messageId: string) => void;
  onVisible:     (messageIds: string[]) => void;
}

const DateSeparator = ({ date }: { date: string }) => {
  const d = new Date(date);
  const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-flux-border" />
      <span className="text-xs text-flux-subtext px-2 py-1 rounded-full bg-flux-surface">{label}</span>
      <div className="flex-1 h-px bg-flux-border" />
    </div>
  );
};

const TypingIndicator = ({ names }: { names: string[] }) => (
  <div className="flex items-center gap-2 px-4 py-2">
    <div className="flex items-center gap-1 bg-flux-received px-3 py-2 rounded-2xl rounded-bl-sm">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-flux-subtext animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
    <span className="text-xs text-flux-subtext">
      {names.length === 1 ? `${names[0]} is typing…` : `${names.join(', ')} are typing…`}
    </span>
  </div>
);

export const MessageList = ({ messages, hasMore, loadMore, onEdit, onReply, onDelete, onVisible }: Props) => {
  const { user } = useAuthStore();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevLengthRef = useRef(messages.length);
  const unreadRef = useRef<Set<string>>(new Set());

  // Auto-scroll to bottom on new messages from self or when at bottom
  useEffect(() => {
    const newCount = messages.length - prevLengthRef.current;
    if (newCount > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.senderId === user?.id || lastMsg?.pending) {
        virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' });
      }
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  const handleItemVisible = useCallback((index: number) => {
    const msg = messages[index];
    if (msg && msg.senderId !== user?.id && msg.status !== 'READ') {
      unreadRef.current.add(msg.id);
      // Batch emit read receipts every 500ms
      scheduleReadFlush(onVisible);
    }
  }, [messages, user?.id, onVisible]);

  const renderMessage = useCallback((index: number) => {
    const message = messages[index];
    if (!message) return null;

    const prevMsg  = messages[index - 1];
    const showDate = !prevMsg || !isSameDay(new Date(message.createdAt), new Date(prevMsg.createdAt));
    const isOwn    = message.senderId === user?.id;
    const showAvatar = !isOwn && (!prevMsg || prevMsg.senderId !== message.senderId || showDate);

    return (
      <div key={message.id}>
        {showDate && <DateSeparator date={message.createdAt} />}
        <div className="px-4">
          <MessageBubble
            message={message}
            isOwn={isOwn}
            showAvatar={showAvatar}
            onEdit={onEdit}
            onReply={onReply}
            onDelete={onDelete}
          />
        </div>
      </div>
    );
  }, [messages, user?.id, onEdit, onReply, onDelete]);

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-flux-subtext text-sm">No messages yet. Say hello!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        itemContent={(index) => renderMessage(index)}
        followOutput="smooth"
        alignToBottom
        overscan={200}
        startReached={hasMore ? loadMore : undefined}
        itemsRendered={(items) => {
          items.forEach(item => handleItemVisible(item.index));
        }}
        components={{
          Header: () => hasMore
            ? <div className="flex justify-center py-3"><span className="text-xs text-flux-subtext">Loading…</span></div>
            : <div className="py-4" />,
        }}
        style={{ flex: 1, height: '100%' }}
      />
    </div>
  );
};

// Debounced flush of read receipts
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingVisible: Set<string> = new Set();

const scheduleReadFlush = (callback: (ids: string[]) => void) => {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    if (pendingVisible.size > 0) {
      callback([...pendingVisible]);
      pendingVisible.clear();
    }
  }, 500);
};
