'use client';
import { useState, useCallback } from 'react';
import { Search, X, Check, Users } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { User, Chat } from '../../types';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import { useChatStore } from '../../store/chat.store';
import toast from 'react-hot-toast';

interface Props {
  open:     boolean;
  onClose:  () => void;
  onSelect: (chat: Chat) => void;
}

export const NewChatModal = ({ open, onClose, onSelect }: Props) => {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading]   = useState(false);
  const { upsertChat }          = useChatStore();

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/users/search', { params: { q } });
      setResults(data.data);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleUser = (user: User) => {
    setSelected(prev =>
      prev.some(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleStart = async () => {
    if (!selected.length) return;
    setLoading(true);
    try {
      let chat: Chat;
      if (selected.length === 1) {
        const { data } = await api.post('/chats/direct', { targetUserId: selected[0].id });
        chat = data.data;
      } else {
        if (!groupName.trim()) { toast.error('Enter a group name'); setLoading(false); return; }
        const { data } = await api.post('/chats/group', {
          name:      groupName,
          memberIds: selected.map(u => u.id),
        });
        chat = data.data;
      }
      upsertChat(chat);
      onSelect(chat);
      onClose();
      setQuery(''); setResults([]); setSelected([]); setGroupName('');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40 animate-fade-in" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-flux-surface border border-flux-border rounded-2xl shadow-2xl z-50 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-flux-border">
            <h2 className="font-semibold text-flux-text">New conversation</h2>
            <button onClick={onClose} className="p-1 rounded-lg text-flux-subtext hover:text-flux-text">
              <X size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 bg-flux-elevated rounded-xl px-3 py-2.5">
              <Search size={15} className="text-flux-subtext" />
              <input
                type="text"
                value={query}
                onChange={e => search(e.target.value)}
                placeholder="Search by name or username…"
                className="flex-1 bg-transparent text-sm text-flux-text placeholder-flux-subtext outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Group name (when multiple selected) */}
          {selected.length > 1 && (
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 bg-flux-elevated rounded-xl px-3 py-2.5">
                <Users size={15} className="text-flux-subtext" />
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Group name…"
                  className="flex-1 bg-transparent text-sm text-flux-text placeholder-flux-subtext outline-none"
                />
              </div>
            </div>
          )}

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-5 pb-3">
              {selected.map(u => (
                <span
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  className="flex items-center gap-1 px-2 py-1 bg-flux-accent/15 text-flux-accent rounded-full text-xs cursor-pointer hover:bg-flux-accent/25"
                >
                  {u.displayName}
                  <X size={10} />
                </span>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="max-h-64 overflow-y-auto px-3 pb-3">
            {loading && (
              <p className="text-center text-xs text-flux-subtext py-4">Searching…</p>
            )}
            {!loading && results.map(user => {
              const isSelected = selected.some(u => u.id === user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors',
                    isSelected ? 'bg-flux-accent/10' : 'hover:bg-flux-elevated'
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-flux-muted flex items-center justify-center overflow-hidden text-sm font-medium flex-shrink-0">
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : user.displayName[0].toUpperCase()
                    }
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-flux-text truncate">{user.displayName}</p>
                    <p className="text-xs text-flux-subtext">@{user.username}</p>
                  </div>
                  {isSelected && <Check size={16} className="text-flux-accent flex-shrink-0" />}
                </button>
              );
            })}
            {!loading && query && results.length === 0 && (
              <p className="text-center text-xs text-flux-subtext py-4">No users found</p>
            )}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="px-5 py-3 border-t border-flux-border">
              <button
                onClick={handleStart}
                disabled={loading}
                className="w-full py-2.5 bg-flux-accent text-white rounded-xl text-sm font-medium hover:bg-flux-accent-h transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating…' : selected.length === 1 ? 'Open conversation' : `Create group (${selected.length})`}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
