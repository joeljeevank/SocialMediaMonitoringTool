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
  Zap,
  TrendingUp,
  Globe
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
      setError('Cannot connect to backend server. Make sure it is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar Utility */}
      <div className="fixed top-5 right-5 z-20 flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-[#111827]/90 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Server Ready</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 mb-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            SocialMedia Monitoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sign in to access your social intelligence dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl">
          {/* Role Mode Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('admin');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Administrator</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('manager');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'manager'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Manager</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Username or Email Address
              </Label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g. admin or manager"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Account Password
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Security note with platform icons */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Secure Session</span>
            </span>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-5 h-5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">in</span>
              <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
            </div>
          </div>
        </div>

        {/* Feature Highlights beneath login */}
        <div className="grid grid-cols-3 gap-2 mt-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>Live Scraping</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Fast Pagination</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Multi-Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
