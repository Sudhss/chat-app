'use client';
import { useState, useCallback } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '../../hooks/useMessages';
import { useChatStore } from '../../store/chat.store';
import { Chat, Message } from '../../types';

interface Props {
  chat:    Chat;
  onBack?: () => void;
}

export const ChatWindow = ({ chat, onBack }: Props) => {
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editTarget, setEditTarget] = useState<Message | null>(null);

  const {
    messages, hasMore, loadMore,
    sendMessage, editMessage, deleteMessage,
    markRead, startTyping, stopTyping,
  } = useMessages(chat.id);

  const handleSend = useCallback((content: string, replyToId?: string) => {
    if (editTarget) {
      editMessage(editTarget.id, content);
      setEditTarget(null);
    } else {
      sendMessage(content, replyToId);
    }
  }, [editTarget, editMessage, sendMessage]);

  const handleEdit = useCallback((msg: Message) => {
    setEditTarget(msg);
    setReplyTo(null);
  }, []);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    setEditTarget(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-flux-bg">
      <ChatHeader chat={chat} onBack={onBack} />

      <MessageList
        messages={messages}
        hasMore={hasMore}
        loadMore={loadMore}
        onEdit={handleEdit}
        onReply={handleReply}
        onDelete={deleteMessage}
        onVisible={markRead}
      />

      <MessageInput
        chatId={chat.id}
        onSend={handleSend}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};
