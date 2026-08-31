'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'admin' | 'manager'>('manager');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Server error. Is backend running?');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-transparent relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md bg-white/80 dark:bg-[#090014]/60 border border-purple-200 dark:border-purple-500/50 shadow-[0_0_40px_rgba(140,26,255,0.15)] backdrop-blur-2xl rounded-2xl overflow-hidden relative z-10">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 h-2 w-full" />
        <CardHeader className="space-y-3 pb-4 pt-8 px-8">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-slate-900 dark:text-white font-bold text-3xl shadow-[0_0_20px_rgba(255,41,117,0.4)]">
              SM
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center text-slate-900 dark:text-white tracking-tight">
            MonitorHQ
          </CardTitle>
          <CardDescription className="text-center text-slate-500 dark:text-gray-400 text-sm font-medium">
            Sign in to access your analytics dashboard
          </CardDescription>
        </CardHeader>

        <div className="flex justify-center px-8 pb-4">
          <div className="relative flex bg-black/40 rounded-full p-1 border border-purple-200 dark:border-purple-500/50 w-full">
            <div
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r from-pink-500 to-purple-600 shadow-md transition-all duration-300 ease-in-out z-0 ${loginType === 'admin' ? 'translate-x-full' : 'translate-x-0'
                }`}
            />
            <button
              onClick={() => { setLoginType('manager'); setUsername(''); setPassword(''); setError(''); }}
              className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ease-in-out ${loginType === 'manager'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Manager Login
            </button>
            <button
              onClick={() => { setLoginType('admin'); setUsername(''); setPassword(''); setError(''); }}
              className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ease-in-out ${loginType === 'admin'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Admin Login
            </button>
          </div>
        </div>

        <CardContent className="px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-600 dark:text-gray-300">
                {loginType === 'admin' ? 'Username' : 'Email Address'}
              </Label>
              <Input
                id="username"
                type={loginType === 'admin' ? 'text' : 'email'}
                placeholder=""
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 h-12 px-4 rounded-xl transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-600 dark:text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 h-12 px-4 rounded-xl transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 font-medium bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full font-bold h-12 text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-slate-900 dark:text-white rounded-xl transition-all shadow-[0_0_20px_rgba(255,41,117,0.3)] hover:shadow-[0_0_25px_rgba(255,41,117,0.5)] border-none">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
