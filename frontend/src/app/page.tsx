'use client';
import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useSocketEvents } from '../hooks/useSocket';
import { useChatStore } from '../store/chat.store';
import { AuthForms } from '../components/auth/AuthForms';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { NewChatModal } from '../components/chat/NewChatModal';
import { Chat } from '../types';
import { cn } from '../lib/utils';

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const { chats, setActiveChat, activeChatId } = useChatStore();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Bind all socket events globally
  useSocketEvents();

  if (!isAuthenticated) return <AuthForms />;

  const activeChat = activeChatId ? chats[activeChatId] : null;

  const handleSelectChat = (chat: Chat) => {
    setActiveChat(chat.id);
    setMobileShowChat(true);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-flux-bg">
      {/* Sidebar */}
      <div className={cn(
        'w-full md:w-80 lg:w-96 flex-shrink-0 h-full',
        mobileShowChat ? 'hidden md:flex' : 'flex'
      )}>
        <div className="w-full">
          <ChatList
            activeChatId={activeChatId}
            onSelect={handleSelectChat}
            onNewChat={() => setNewChatOpen(true)}
          />
        </div>
      </div>

      {/* Chat pane */}
      <div className={cn(
        'flex-1 h-full',
        !mobileShowChat ? 'hidden md:flex' : 'flex',
        'flex-col'
      )}>
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            onBack={() => { setMobileShowChat(false); setActiveChat(null); }}
          />
        ) : (
          <EmptyState onNewChat={() => setNewChatOpen(true)} />
        )}
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSelect={handleSelectChat}
      />
    </div>
  );
}

const EmptyState = ({ onNewChat }: { onNewChat: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
    <div className="w-16 h-16 rounded-2xl bg-flux-accent/10 flex items-center justify-center mb-4">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
          fill="none" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <h2 className="text-flux-text font-semibold mb-1">Select a conversation</h2>
    <p className="text-flux-subtext text-sm mb-4">Choose from your chats or start a new one</p>
    <button
      onClick={onNewChat}
      className="px-4 py-2 bg-flux-accent text-white rounded-xl text-sm font-medium hover:bg-flux-accent-h transition-colors"
    >
      New conversation
    </button>
  </div>
);
