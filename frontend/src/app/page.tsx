'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  Shield, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Key, 
  LogIn, 
  Cpu, 
  Radar, 
  RefreshCw,
  Info,
  Server,
  Radio,
  Globe,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/youtube-icon';

export default function AdvancedLoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'admin' | 'manager'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Ping backend to show live telemetry indicator
  useEffect(() => {
    fetch('http://localhost:3001/accounts')
      .then((res) => {
        if (res.ok) setServerOnline(true);
        else setServerOnline(false);
      })
      .catch(() => setServerOnline(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Please enter both your identifier and password.');
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
        router.push('/dashboard');
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'Invalid credentials. Please verify your username and password.');
      }
    } catch {
      setError('Cannot reach server. Please ensure backend is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type: 'admin' | 'manager') => {
    setLoginType(type);
    setError('');
    if (type === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 bg-slate-50 dark:bg-[#06080e] relative overflow-hidden select-none">
      {/* Dynamic Cyber Auroras */}
      <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d40a_1px,transparent_1px),linear-gradient(to_bottom,#06b6d40a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Floating Utility Bar */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-[#0c101d]/80 border border-slate-200 dark:border-cyan-500/30 backdrop-blur-xl shadow-sm text-xs font-semibold text-slate-700 dark:text-cyan-300">
          <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {serverOnline ? 'Engine v2.4 Online • Port 3001' : 'Engine Standby'}
        </div>
        <ThemeToggle />
      </div>

      {/* Master Interactive Dual-Pane Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white/85 dark:bg-[#090d16]/85 border border-slate-200/80 dark:border-cyan-500/30 rounded-3xl sm:rounded-[2.5rem] shadow-[0_20px_70px_rgba(6,182,212,0.15)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden relative z-10">
        
        {/* LEFT PANE: Live Telemetry & Intelligence Command Center (Hidden on small screens) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-100/90 via-cyan-950/20 to-indigo-950/40 dark:from-[#080d1a] dark:via-[#091122] dark:to-[#05070e] p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-cyan-500/20 relative overflow-hidden">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header Brand */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/40">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    MonitorHQ
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    Pro Suite
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                  Autonomous Social Media Intelligence Platform
                </p>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                Real-Time Analytics & Cross-Platform Scraping
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 mt-1 leading-relaxed">
                Connect and monitor LinkedIn campaigns, YouTube channels, user performance, and daily metrics with sub-second accuracy.
              </p>
            </div>
          </div>

          {/* Live System Telemetry Cards */}
          <div className="relative z-10 my-8 space-y-3">
            {/* Telemetry Pill 1: LinkedIn Engine */}
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-cyan-500/20 backdrop-blur-md flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                  in
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">LinkedIn Collector</p>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400">Playwright Headless Engine Active</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>

            {/* Telemetry Pill 2: YouTube API */}
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-cyan-500/20 backdrop-blur-md flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center font-bold text-xs">
                  <YoutubeIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">YouTube Intelligence</p>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400">Google OAuth 2.0 & Data API v3</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                <Radio className="w-3 h-3 text-cyan-500" />
                99.9% Uptime
              </span>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Posts Parsed</p>
                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">24.5k+</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</p>
                <p className="text-base font-black text-cyan-600 dark:text-cyan-400 mt-0.5">14 ms</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Encryption</p>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">TLS 1.3</p>
              </div>
            </div>
          </div>

          {/* Footer Security Badges */}
          <div className="relative z-10 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Role-Based Access Control
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              Multi-Tenant Architecture
            </span>
          </div>
        </div>

        {/* RIGHT PANE: Modern Interactive Auth Portal */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-6">
            
            {/* Top Form Heading */}
            <div className="space-y-1 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-purple-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                <Zap className="w-3 h-3 text-cyan-500" />
                Secure Portal Access
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Sign In to Console
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                Choose your portal tier to access metrics and dashboards.
              </p>
            </div>

            {/* Portal Switcher Buttons (Cyber Cyan Glow) */}
            <div className="relative flex bg-slate-100 dark:bg-black/50 rounded-2xl p-1.5 border border-slate-200 dark:border-white/10 shadow-inner">
              <div
                className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 shadow-md transition-all duration-300 ease-out z-0 ${
                  loginType === 'admin' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  setLoginType('admin');
                  setError('');
                }}
                className={`relative z-10 flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  loginType === 'admin'
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginType('manager');
                  setError('');
                }}
                className={`relative z-10 flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  loginType === 'manager'
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                Team Manager
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleLogin} className="space-y-4 pt-1">
              {/* Username/Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                  {loginType === 'admin' ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-cyan-500" />
                      Admin Username
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5 text-cyan-500" />
                      Email Address / Username
                    </>
                  )}
                </Label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    placeholder={loginType === 'admin' ? 'admin' : 'manager@company.com'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 h-12 px-4 rounded-2xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-500" />
                    Security Password
                  </Label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 h-12 px-4 pr-11 rounded-2xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-cyan-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Callout */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1 leading-relaxed">{error}</span>
                </div>
              )}

              {/* Submit CTA Button (Vibrant Cyber Cyan & Indigo) */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full font-bold h-12 text-sm bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white rounded-2xl transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 border-none flex items-center justify-center gap-2 mt-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Authentication...
                  </>
                ) : (
                  <>
                    Authenticate & Enter Platform
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials Widget */}
            <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold">
                Quick 1-Click Sandbox Credentials:
              </span>
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-cyan-500/10 text-slate-800 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>Fill Default Admin</span>
                <span className="font-mono text-[11px] opacity-80">(admin / admin123)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
