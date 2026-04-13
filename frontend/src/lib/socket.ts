import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

type SocketInstance = Socket | null;
let socket: SocketInstance = null;

export const getSocket = (): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth:            { token: getAccessToken() },
    transports:      ['websocket', 'polling'],
    reconnection:    true,
    reconnectionDelay:      1000,
    reconnectionDelayMax:   10000,
    reconnectionAttempts:   Infinity,
    timeout:         10000,
    autoConnect:     false,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    startHeartbeat();
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    stopHeartbeat();
    if (reason === 'io server disconnect') {
      // Server forced disconnect — re-auth before reconnecting
      socket?.connect();
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
};

export const connectSocket = (token: string) => {
  const s = getSocket();
  if (s.auth && typeof s.auth === 'object') {
    (s.auth as any).token = token;
  }
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  stopHeartbeat();
  socket?.disconnect();
  socket = null;
};

// Heartbeat to keep presence alive
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const startHeartbeat = () => {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    socket?.emit('presence:heartbeat');
  }, 30_000);
};

const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};
