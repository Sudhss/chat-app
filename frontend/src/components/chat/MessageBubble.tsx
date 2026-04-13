'use client';
import { useState, memo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Clock, Trash2, Pencil, Reply, MoreHorizontal } from 'lucide-react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface Props {
  message:    Message;
  isOwn:      boolean;
  showAvatar: boolean;
  onEdit:     (msg: Message) => void;
  onReply:    (msg: Message) => void;
  onDelete:   (messageId: string) => void;
}

const StatusIcon = ({ status }: { status: Message['status'] }) => {
  if (status === 'SENDING')   return <Clock size={12} className="text-flux-subtext" />;
  if (status === 'SENT')      return <Check size={12} className="text-flux-subtext" />;
  if (status === 'DELIVERED') return <CheckCheck size={12} className="text-flux-subtext" />;
  if (status === 'READ')      return <CheckCheck size={12} className="text-blue-400" />;
  return null;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
  return format(d, 'MMM d, HH:mm');
};

export const MessageBubble = memo(({ message, isOwn, showAvatar, onEdit, onReply, onDelete }: Props) => {
  const [hovering, setHovering] = useState(false);
  const isDeleted = !!message.deletedAt;

  return (
    <div
      className={cn('flex gap-2 group mb-1', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="w-7 h-7 flex-shrink-0 mt-auto">
          {showAvatar && (
            <div className="w-7 h-7 rounded-full bg-flux-muted flex items-center justify-center text-xs font-medium overflow-hidden">
              {message.sender.avatarUrl
                ? <img src={message.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                : message.sender.displayName[0].toUpperCase()
              }
            </div>
          )}
        </div>
      )}

      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name (group chat) */}
        {!isOwn && showAvatar && (
          <span className="text-xs text-flux-subtext mb-1 ml-1">{message.sender.displayName}</span>
        )}

        {/* Reply preview */}
        {message.replyTo && !isDeleted && (
          <div className={cn(
            'flex items-start gap-2 px-3 py-1.5 rounded-t-xl text-xs border-l-2 mb-0.5 w-full',
            isOwn ? 'bg-flux-accent/20 border-flux-accent' : 'bg-flux-elevated border-flux-muted'
          )}>
            <div className="truncate">
              <span className="text-flux-accent font-medium">{message.replyTo.sender.displayName}</span>
              <p className="text-flux-subtext truncate">{message.replyTo.content ?? 'Attachment'}</p>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className={cn(
          'relative px-3 py-2 rounded-2xl text-sm leading-relaxed',
          isOwn
            ? 'bg-flux-sent text-white rounded-br-sm'
            : 'bg-flux-received text-flux-text rounded-bl-sm',
          isDeleted && 'opacity-50 italic',
          message.pending && 'opacity-70',
          message.failed && 'opacity-50 border border-red-500',
        )}>
          {isDeleted
            ? <span className="text-flux-subtext text-xs">Message deleted</span>
            : message.type === 'IMAGE' && message.media?.[0]
              ? (
                <img
                  src={message.media[0].url}
                  alt="Image"
                  className="max-w-[240px] rounded-xl"
                  loading="lazy"
                />
              )
              : <span className="break-words whitespace-pre-wrap">{message.content}</span>
          }

          {/* Edited badge */}
          {message.editedAt && !isDeleted && (
            <span className="text-[10px] opacity-50 ml-1">(edited)</span>
          )}

          {/* Time + status */}
          <div className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-[10px] opacity-50">{formatTime(message.createdAt)}</span>
            {isOwn && !isDeleted && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>

      {/* Action menu */}
      {hovering && !isDeleted && (
        <div className={cn('flex items-center gap-1 self-center', isOwn ? 'mr-1' : 'ml-1')}>
          <button
            onClick={() => onReply(message)}
            className="p-1 rounded-lg hover:bg-flux-elevated text-flux-subtext hover:text-flux-text transition-colors"
          >
            <Reply size={14} />
          </button>
          {isOwn && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1 rounded-lg hover:bg-flux-elevated text-flux-subtext hover:text-flux-text transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="bg-flux-elevated border border-flux-border rounded-xl p-1 shadow-xl z-50 min-w-[140px] animate-fade-in"
                  sideOffset={5}
                >
                  {message.type === 'TEXT' && (
                    <DropdownMenu.Item
                      onClick={() => onEdit(message)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-flux-text rounded-lg hover:bg-flux-border cursor-pointer"
                    >
                      <Pencil size={14} /> Edit
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item
                    onClick={() => onDelete(message.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded-lg hover:bg-flux-border cursor-pointer"
                  >
                    <Trash2 size={14} /> Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
