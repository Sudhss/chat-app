'use client';
import { useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users, Plus, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Chat } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import { useChatStore } from '../../store/chat.store';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Props {
  activeChatId: string | null;
  onSelect:     (chat: Chat) => void;
  onNewChat:    () => void;
}

const ChatListItem = ({
  chat, isActive, currentUserId, unread, onClick
}: {
  chat: Chat; isActive: boolean; currentUserId: string; unread: number; onClick: () => void;
}) => {
  const isDirect = chat.type === 'DIRECT';
  const other    = isDirect ? chat.participants.find(p => p.userId !== currentUserId)?.user : null;
  const name     = isDirect ? (other?.displayName ?? 'Unknown') : (chat.name ?? 'Group');
  const avatarUrl = isDirect ? other?.avatarUrl : chat.avatarUrl;
  const isOnline  = isDirect && (other?.isOnline ?? false);
  const lastMsg   = chat.messages?.[0];
  const lastMsgText = lastMsg?.deletedAt
    ? 'Message deleted'
    : lastMsg?.content ?? (lastMsg?.media?.length ? 'Sent an attachment' : '');

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left',
        isActive ? 'bg-flux-accent/15 text-flux-text' : 'hover:bg-flux-elevated text-flux-text'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-flux-muted flex items-center justify-center overflow-hidden">
          {avatarUrl
            ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            : !isDirect
              ? <Users size={18} className="text-flux-subtext" />
              : <span className="font-medium">{name[0].toUpperCase()}</span>
          }
        </div>
        {isDirect && (
          <span className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2',
            isActive ? 'border-flux-accent/15' : 'border-flux-surface',
            isOnline ? 'bg-flux-online' : 'bg-flux-muted'
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-medium text-sm truncate">{name}</span>
          {lastMsg && (
            <span className="text-[10px] text-flux-subtext flex-shrink-0 ml-1">
              {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-flux-subtext truncate">{lastMsgText}</p>
          {unread > 0 && (
            <span className="flex-shrink-0 ml-1 min-w-[18px] h-[18px] rounded-full bg-flux-accent text-white text-[10px] font-medium flex items-center justify-center px-1">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export const ChatList = ({ activeChatId, onSelect, onNewChat }: Props) => {
  const { user } = useAuthStore();
  const { chats, setChats, unreadCounts } = useChatStore();
  const chatList = Object.values(chats).sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  useEffect(() => {
    api.get('/chats').then(({ data }) => {
      setChats(data.data);
    }).catch(() => toast.error('Failed to load chats'));
  }, []);

  return (
    <div className="flex flex-col h-full bg-flux-surface border-r border-flux-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-flux-border">
        <h1 className="text-lg font-semibold text-flux-text">Messages</h1>
        <button
          onClick={onNewChat}
          className="p-2 rounded-xl bg-flux-accent/10 text-flux-accent hover:bg-flux-accent/20 transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 bg-flux-elevated rounded-xl px-3 py-2">
          <Search size={15} className="text-flux-subtext flex-shrink-0" />
          <input
            type="text"
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-sm text-flux-text placeholder-flux-subtext outline-none"
          />
        </div>
      </div>

      {/* Chat items */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {chatList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-flux-subtext text-sm">No conversations yet</p>
            <button onClick={onNewChat} className="mt-2 text-flux-accent text-sm hover:underline">
              Start a new chat
            </button>
          </div>
        ) : (
          chatList.map(chat => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChatId}
              currentUserId={user?.id ?? ''}
              unread={unreadCounts[chat.id] ?? 0}
              onClick={() => onSelect(chat)}
            />
          ))
        )}
      </div>

      {/* User footer */}
      {user && (
        <div className="px-3 py-3 border-t border-flux-border flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-flux-muted flex items-center justify-center overflow-hidden text-sm font-medium">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : user.displayName[0].toUpperCase()
              }
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-flux-surface bg-flux-online" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-flux-text truncate">{user.displayName}</p>
            <p className="text-[10px] text-flux-subtext">@{user.username}</p>
          </div>
        </div>
      )}
    </div>
  );
};
