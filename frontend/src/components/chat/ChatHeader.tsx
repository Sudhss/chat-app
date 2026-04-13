'use client';
import { Phone, Video, Search, MoreVertical, Users, ArrowLeft } from 'lucide-react';
import { Chat } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../lib/utils';
import { useChatStore } from '../../store/chat.store';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  chat:    Chat;
  onBack?: () => void;
}

export const ChatHeader = ({ chat, onBack }: Props) => {
  const { user } = useAuthStore();
  const typingUsers = useChatStore(s => s.typingUsers[chat.id] ?? []);

  const isDirect = chat.type === 'DIRECT';
  const other    = isDirect
    ? chat.participants.find(p => p.userId !== user?.id)?.user
    : null;

  const isOnline   = other?.isOnline ?? false;
  const lastSeen   = other?.lastSeen;
  const name       = isDirect ? other?.displayName : chat.name;
  const avatarUrl  = isDirect ? other?.avatarUrl : chat.avatarUrl;
  const memberCount = chat.participants.length;

  const statusText = () => {
    if (typingUsers.length > 0) {
      return typingUsers.map(u => u.displayName).join(', ') +
        (typingUsers.length === 1 ? ' is typing…' : ' are typing…');
    }
    if (isDirect) {
      if (isOnline) return 'Online';
      if (lastSeen) return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
      return 'Offline';
    }
    return `${memberCount} members`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-flux-border bg-flux-surface">
      {/* Back button (mobile) */}
      {onBack && (
        <button onClick={onBack} className="md:hidden p-1 text-flux-subtext hover:text-flux-text">
          <ArrowLeft size={20} />
        </button>
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-flux-muted flex items-center justify-center overflow-hidden">
          {avatarUrl
            ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            : !isDirect
              ? <Users size={18} className="text-flux-subtext" />
              : <span className="font-medium text-sm">{name?.[0]?.toUpperCase()}</span>
          }
        </div>
        {isDirect && (
          <span className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-flux-surface',
            isOnline ? 'bg-flux-online' : 'bg-flux-muted'
          )} />
        )}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-flux-text truncate text-sm">{name}</p>
        <p className={cn(
          'text-xs truncate transition-colors',
          typingUsers.length > 0 ? 'text-flux-accent' :
          isOnline && isDirect ? 'text-flux-online' : 'text-flux-subtext'
        )}>
          {statusText()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-xl text-flux-subtext hover:text-flux-text hover:bg-flux-elevated transition-colors">
          <Phone size={18} />
        </button>
        <button className="p-2 rounded-xl text-flux-subtext hover:text-flux-text hover:bg-flux-elevated transition-colors">
          <Video size={18} />
        </button>
        <button className="p-2 rounded-xl text-flux-subtext hover:text-flux-text hover:bg-flux-elevated transition-colors">
          <Search size={18} />
        </button>
        <button className="p-2 rounded-xl text-flux-subtext hover:text-flux-text hover:bg-flux-elevated transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
};
