'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  60_000,
      retry:      1,
      refetchOnWindowFocus: false,
    },
  },
});

const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, refresh } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // On mount, try to restore session via refresh token cookie
    if (!isAuthenticated) {
      refresh().finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-flux-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-flux-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthInitializer>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1a1d27', color: '#e2e8f0', border: '1px solid #2e3148', fontSize: '13px' },
        }}
      />
    </AuthInitializer>
  </QueryClientProvider>
);
