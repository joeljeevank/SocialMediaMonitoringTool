'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  BarChart3, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Shield,
  Radio
} from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/youtube-icon';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'manager'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Please enter your username and password.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('admin_token', data.access_token);
        localStorage.setItem('user_role', data.role);
        if (data.name) localStorage.setItem('user_name', data.name);
        if (data.companyName) localStorage.setItem('company_name', data.companyName);
        if (data.companyRole) localStorage.setItem('company_role', data.companyRole);
        if (data.email) localStorage.setItem('user_email', data.email);
        router.push('/dashboard/profile');
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'Invalid username or password.');
      }
    } catch {
      setError('Unable to reach authentication server. Please verify the backend service is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors">
      {/* Dynamic Background Ambient Blobs */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[450px] h-[300px] bg-gradient-to-tl from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 glass-panel relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              SocialPulse
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-blue-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                PRO 2.0
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Collector Engine</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Center Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6 relative z-10">
        <div className="w-full max-w-[430px]">
          {/* Main Card */}
          <div className="glass-panel rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden border border-slate-200/90 dark:border-white/10">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 mb-3">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Intelligence Command
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your credentials to access social telemetry
              </p>
            </div>

            {/* Role Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/90 dark:bg-black/40 rounded-2xl mb-5 text-xs font-semibold border border-slate-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setRole('admin');
                  setError('');
                }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'admin'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('manager');
                  setError('');
                }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'manager'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Manager</span>
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username or Email
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-10 bg-slate-50/80 dark:bg-black/50 border-slate-200 dark:border-white/10 text-xs focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-slate-50/80 dark:bg-black/50 border-slate-200 dark:border-white/10 text-xs focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Command Center</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </form>

            {/* Bottom Platform Badges */}
            <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Encrypted Telemetry</span>
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-sky-500/20 text-sky-500 flex items-center justify-center font-bold text-[9px]">in</span>
                  LinkedIn
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                  <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                  YouTube
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-white/10 relative z-10">
        <span>SocialPulse Analytics &copy; {new Date().getFullYear()} • High-Speed Intelligence Platform</span>
      </footer>
    </div>
  );
}
