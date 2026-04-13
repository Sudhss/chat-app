import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';
import api, { setAccessToken, clearAccessToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthStore {
  user:            User | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;

  login:    (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout:   () => Promise<void>;
  refresh:  () => Promise<boolean>;
  setUser:  (user: User) => void;
}

interface RegisterData {
  email: string; username: string; displayName: string; password: string;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,
      isLoading:       false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { user, accessToken } = data.data;
          setAccessToken(accessToken);
          connectSocket(accessToken);
          set({ user, accessToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (registerData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', registerData);
          const { user, accessToken } = data.data;
          setAccessToken(accessToken);
          connectSocket(accessToken);
          set({ user, accessToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } finally {
          clearAccessToken();
          disconnectSocket();
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      refresh: async () => {
        try {
          const { data } = await api.post('/auth/refresh');
          const { accessToken } = data.data;
          setAccessToken(accessToken);
          const me = await api.get('/auth/me');
          set({ user: me.data.data, accessToken, isAuthenticated: true });
          connectSocket(accessToken);
          return true;
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false });
          return false;
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name:    'flux-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
