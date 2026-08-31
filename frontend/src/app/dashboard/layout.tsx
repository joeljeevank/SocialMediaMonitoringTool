'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Settings, LogOut, UserPlus, User, FileText } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
    } else {
      setUserRole(localStorage.getItem('user_role'));
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-transparent p-4 md:p-6 gap-6 relative overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white/80 dark:bg-[#090014]/60 border border-purple-200 dark:border-purple-500/20 flex flex-col p-5 rounded-2xl shadow-[0_0_40px_rgba(140,26,255,0.15)] h-full backdrop-blur-2xl relative z-10 flex-shrink-0">
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-slate-900 dark:text-white font-bold text-sm shadow-[0_0_15px_rgba(255,41,117,0.4)]">
            SM
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            MonitorHQ
          </h2>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard/profile" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname === '/dashboard/profile' ? 'bg-gradient-to-r from-purple-100 dark:from-purple-500/20 to-pink-100 text-slate-900 dark:text-white border border-purple-200 dark:border-purple-500/30 shadow-inner' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'}`}>
            <User className="w-5 h-5" />
            My Profile
          </Link>
          <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname === '/dashboard' ? 'bg-gradient-to-r from-purple-100 dark:from-purple-500/20 to-pink-100 text-slate-900 dark:text-white border border-purple-200 dark:border-purple-500/30 shadow-inner' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'}`}>
            <LayoutDashboard className="w-5 h-5" />
            LinkedIn Dashboard
          </Link>
          {userRole === 'super_admin' && (
            <>
              <Link href="/dashboard/users" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname === '/dashboard/users' ? 'bg-gradient-to-r from-purple-100 dark:from-purple-500/20 to-pink-100 text-slate-900 dark:text-white border border-purple-200 dark:border-purple-500/30 shadow-inner' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'}`}>
                <Users className="w-5 h-5" />
                User Management
              </Link>
              <Link href="/dashboard/users/add" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname === '/dashboard/users/add' ? 'bg-gradient-to-r from-purple-100 dark:from-purple-500/20 to-pink-100 text-slate-900 dark:text-white border border-purple-200 dark:border-purple-500/30 shadow-inner' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'}`}>
                <UserPlus className="w-5 h-5" />
                Add User
              </Link>
            </>
          )}
          <Link href="/dashboard/reports" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname === '/dashboard/reports' ? 'bg-gradient-to-r from-purple-100 dark:from-purple-500/20 to-pink-100 text-slate-900 dark:text-white border border-purple-200 dark:border-purple-500/30 shadow-inner' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'}`}>
            <FileText className="w-5 h-5" />
            Reports
          </Link>
          <Link href="/dashboard/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${pathname === '/dashboard/settings' ? 'bg-gradient-to-r from-purple-100 dark:from-purple-500/20 to-pink-100 text-slate-900 dark:text-white border border-purple-200 dark:border-purple-500/30 shadow-inner' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'}`}>
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-purple-200 dark:border-purple-500/50 space-y-2">
          <div className="px-4 py-2 flex items-center justify-between text-slate-500 dark:text-gray-400 font-medium">
            <span>Theme</span>
            <ThemeToggle />
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('admin_token');
              router.push('/');
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 transition-all w-full text-left font-medium border border-transparent hover:border-red-500/30"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden h-full relative z-10">
        <div className="h-full bg-white/80 dark:bg-[#090014]/60 rounded-2xl shadow-[0_0_40px_rgba(140,26,255,0.15)] p-6 md:p-8 border border-purple-200 dark:border-purple-500/20 overflow-y-auto backdrop-blur-2xl custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
