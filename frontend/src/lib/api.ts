import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL:         `${API_URL}/api`,
  withCredentials: true,
  timeout:         15_000,
  headers:         { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue:  Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token!));
  failedQueue = [];
};

// Attach access token from memory store
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry || original.url === '/auth/refresh') {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const { data } = await api.post('/auth/refresh');
      const newToken = data.data.accessToken;
      setAccessToken(newToken);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      clearAccessToken();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── In-memory token store (avoids localStorage XSS) ─────────────
let _accessToken: string | null = null;
export const getAccessToken    = () => _accessToken;
export const setAccessToken    = (t: string) => { _accessToken = t; };
export const clearAccessToken  = () => { _accessToken = null; };

export default api;
