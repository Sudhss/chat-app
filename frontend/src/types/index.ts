// ── User ─────────────────────────────────────────────────────────
export interface User {
  id:          string;
  email:       string;
  username:    string;
  displayName: string;
  avatarUrl:   string | null;
  bio?:        string;
  isOnline:    boolean;
  lastSeen?:   string;
  createdAt:   string;
}

// ── Auth ─────────────────────────────────────────────────────────
export interface AuthState {
  user:        User | null;
  accessToken: string | null;
  isLoading:   boolean;
  isAuthenticated: boolean;
}

// ── Chat ─────────────────────────────────────────────────────────
export type ChatType = 'DIRECT' | 'GROUP';
export type ParticipantRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface ChatParticipant {
  id:          string;
  userId:      string;
  chatId:      string;
  role:        ParticipantRole;
  joinedAt:    string;
  lastReadAt?: string;
  unreadCount: number;
  isArchived:  boolean;
  isMuted:     boolean;
  user:        User;
}

export interface Chat {
  id:            string;
  type:          ChatType;
  name?:         string;
  description?:  string;
  avatarUrl?:    string;
  lastMessageAt?: string;
  createdAt:     string;
  participants:  ChatParticipant[];
  messages:      Message[];  // last message only from list endpoint
}

// ── Message ───────────────────────────────────────────────────────
export type MessageType   = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface MessageReceipt {
  userId:       string;
  deliveredAt?: string;
  readAt?:      string;
}

export interface Media {
  id:           string;
  filename:     string;
  originalName: string;
  mimeType:     string;
  size:         number;
  url:          string;
  thumbnailUrl?: string;
  width?:       number;
  height?:      number;
}

export interface Message {
  id:        string;
  chatId:    string;
  senderId:  string;
  content?:  string;
  type:      MessageType;
  status:    MessageStatus;
  replyToId?: string;
  replyTo?:  { id: string; content?: string; sender: { displayName: string } };
  deletedAt?: string;
  editedAt?:  string;
  createdAt:  string;
  updatedAt:  string;
  sender:    Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  media?:    Media[];
  receipts?: MessageReceipt[];
  // Optimistic
  tempId?:   string;
  pending?:  boolean;
  failed?:   boolean;
}

// ── Socket events ────────────────────────────────────────────────
export interface TypingUser {
  userId:      string;
  displayName: string;
  chatId:      string;
}

// ── API ──────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data:    T;
}

export interface PaginatedMessages {
  messages:   Message[];
  hasMore:    boolean;
  nextCursor: string | null;
}

export interface ApiError {
  success: false;
  error:   { message: string; code: number; details?: Record<string, string[]> };
}
