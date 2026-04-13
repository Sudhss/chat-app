'use client';
import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Paperclip, Smile, X, Mic } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Message } from '../../types';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Props {
  chatId:      string;
  onSend:      (content: string, replyToId?: string) => void;
  onTyping:    () => void;
  onStopTyping:() => void;
  replyTo:     Message | null;
  onCancelReply: () => void;
  disabled?:   boolean;
}

export const MessageInput = ({ chatId, onSend, onTyping, onStopTyping, replyTo, onCancelReply, disabled }: Props) => {
  const [value, setValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, replyTo?.id);
    setValue('');
    onCancelReply();
    onStopTyping();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, replyTo, onSend, onCancelReply, onStopTyping]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    onTyping();
    // Auto-resize textarea
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // 1. Get presigned URL
      const { data: presignData } = await api.post('/media/presign', {
        filename: file.name,
        mimeType: file.type,
        size:     file.size,
      });
      const { uploadUrl, mediaId } = presignData.data;

      // 2. Upload directly to S3/MinIO
      await fetch(uploadUrl, {
        method:  'PUT',
        body:    file,
        headers: { 'Content-Type': file.type },
      });

      // 3. Send message with mediaId
      onSend('', replyTo?.id); // handled via socket with mediaIds in production
      toast.success('File uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="px-4 pb-4">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-flux-elevated rounded-xl border-l-2 border-flux-accent">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-flux-accent font-medium">{replyTo.sender.displayName}</p>
            <p className="text-xs text-flux-subtext truncate">{replyTo.content ?? 'Attachment'}</p>
          </div>
          <button onClick={onCancelReply} className="text-flux-subtext hover:text-flux-text flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 bg-flux-elevated rounded-2xl px-3 py-2 border border-flux-border focus-within:border-flux-accent/50 transition-colors">
        {/* Attachment */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="flex-shrink-0 p-1.5 rounded-xl text-flux-subtext hover:text-flux-text hover:bg-flux-border transition-colors disabled:opacity-40"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onStopTyping}
          placeholder="Message…"
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-flux-text placeholder-flux-subtext text-sm resize-none outline-none leading-relaxed max-h-40 py-0.5"
          style={{ height: 'auto' }}
        />

        {/* Emoji placeholder */}
        <button className="flex-shrink-0 p-1.5 rounded-xl text-flux-subtext hover:text-flux-text hover:bg-flux-border transition-colors">
          <Smile size={18} />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            value.trim() && !disabled
              ? 'bg-flux-accent text-white hover:bg-flux-accent-h scale-100'
              : 'bg-flux-border text-flux-muted scale-95 opacity-50 cursor-not-allowed'
          )}
        >
          <Send size={15} />
        </button>
      </div>

      {uploading && (
        <p className="text-xs text-flux-subtext mt-1 ml-2">Uploading…</p>
      )}
    </div>
  );
};
