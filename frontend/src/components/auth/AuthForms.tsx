'use client';
import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

type Tab = 'login' | 'register';

export const AuthForms = () => {
  const [tab, setTab]       = useState<Tab>('login');
  const { login, register, isLoading } = useAuthStore();

  // Login state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regEmail, setRegEmail]           = useState('');
  const [regUsername, setRegUsername]     = useState('');
  const [regDisplayName, setRegDisplay]   = useState('');
  const [regPassword, setRegPassword]     = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ email: regEmail, username: regUsername, displayName: regDisplayName, password: regPassword });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-flux-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-flux-accent flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-flux-text">Flux</h1>
          <p className="text-flux-subtext text-sm mt-1">Real-time messaging</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-flux-surface rounded-xl p-1 mb-6 border border-flux-border">
          {(['login', 'register'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                tab === t ? 'bg-flux-accent text-white' : 'text-flux-subtext hover:text-flux-text'
              )}
            >
              {t === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-flux-accent text-white rounded-xl text-sm font-medium hover:bg-flux-accent-h transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <InputField label="Display name" value={regDisplayName} onChange={setRegDisplay} placeholder="Your name" />
            <InputField label="Username" value={regUsername} onChange={setRegUsername} placeholder="username" />
            <InputField label="Email" type="email" value={regEmail} onChange={setRegEmail} placeholder="you@example.com" />
            <InputField label="Password" type="password" value={regPassword} onChange={setRegPassword} placeholder="Min. 8 characters" />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-flux-accent text-white rounded-xl text-sm font-medium hover:bg-flux-accent-h transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const InputField = ({
  label, value, onChange, type = 'text', placeholder
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) => (
  <div>
    <label className="block text-xs font-medium text-flux-subtext mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required
      className="w-full px-3 py-2.5 bg-flux-surface border border-flux-border rounded-xl text-sm text-flux-text placeholder-flux-muted outline-none focus:border-flux-accent/60 transition-colors"
    />
  </div>
);
