'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  UserPlus, 
  User, 
  FileText,
  BarChart3,
  ChevronRight,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { YoutubeIcon } from '@/components/icons/youtube-icon';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/');
    } else {
      setUserRole(localStorage.getItem('user_role'));
      setUserName(localStorage.getItem('user_name') || 'Administrator');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('company_name');
    localStorage.removeItem('company_role');
    router.push('/');
  };

  if (!mounted) return null;

  const navItems = [
    {
      href: '/dashboard',
      label: 'LinkedIn Overview',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      href: '/dashboard/youtube',
      label: 'YouTube Analytics',
      icon: YoutubeIcon,
      active: pathname.startsWith('/dashboard/youtube'),
      badge: 'Live',
    },
    {
      href: '/dashboard/profile',
      label: 'My Profile',
      icon: User,
      active: pathname === '/dashboard/profile',
    },
    ...(userRole === 'super_admin' ? [
      {
        href: '/dashboard/users',
        label: 'User Management',
        icon: Users,
        active: pathname === '/dashboard/users',
      },
      {
        href: '/dashboard/users/add',
        label: 'Add New User',
        icon: UserPlus,
        active: pathname === '/dashboard/users/add',
      },
    ] : []),
    {
      href: '/dashboard/reports',
      label: 'Reports & Export',
      icon: FileText,
      active: pathname === '/dashboard/reports',
    },
    {
      href: '/dashboard/settings',
      label: 'Account Settings',
      icon: Settings,
      active: pathname === '/dashboard/settings',
    },
  ];

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'LinkedIn Monitoring';
    if (pathname.startsWith('/dashboard/youtube')) return 'YouTube Intelligence';
    if (pathname === '/dashboard/profile') return 'Account Profile';
    if (pathname === '/dashboard/users') return 'User Management';
    if (pathname === '/dashboard/users/add') return 'Add System User';
    if (pathname === '/dashboard/reports') return 'Analytics Reports';
    if (pathname === '/dashboard/settings') return 'Platform Settings';
    if (pathname.startsWith('/dashboard/')) return 'Profile Analytics';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#06080e] p-3 sm:p-4 md:p-6 gap-4 sm:gap-6 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 lg:static lg:w-64 bg-white/90 dark:bg-[#080d1a]/90 border border-slate-200/80 dark:border-cyan-500/20 flex flex-col p-5 rounded-none lg:rounded-3xl shadow-[0_10px_40px_rgba(6,182,212,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)] h-full backdrop-blur-2xl transition-transform duration-300 ease-in-out flex-shrink-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="mb-6 px-2 flex items-center justify-between">
          <Link href="/dashboard" prefetch={true} className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                MonitorHQ
              </h2>
              <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                Enterprise Social
              </p>
            </div>
          </Link>
          <button 
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  item.active
                    ? 'bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-purple-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    item.active 
                      ? 'bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-sm' 
                      : 'text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-white/5'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-cyan-500/20 space-y-3">
          {/* User Mini Profile */}
          <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
              {userName.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {userName}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold capitalize truncate">
                <Shield className="w-3 h-3" />
                {userRole?.replace('_', ' ') || 'User'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all border border-transparent hover:border-red-500/20 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 min-w-0">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white/90 dark:bg-[#080d1a]/90 border border-slate-200/80 dark:border-cyan-500/20 rounded-2xl sm:rounded-3xl shadow-[0_5px_25px_rgba(6,182,212,0.06)] dark:shadow-[0_5px_25px_rgba(0,0,0,0.5)] px-4 sm:px-6 flex items-center justify-between backdrop-blur-2xl mb-4 sm:mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-400 dark:text-gray-500 hidden sm:inline">MonitorHQ</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-gray-600 hidden sm:inline" />
              <h1 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Monitoring Active
            </div>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <div className="flex-1 bg-white/90 dark:bg-[#080d1a]/80 rounded-2xl sm:rounded-3xl shadow-[0_10px_40px_rgba(6,182,212,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)] p-4 sm:p-6 md:p-8 border border-slate-200/80 dark:border-cyan-500/20 overflow-y-auto backdrop-blur-2xl custom-scrollbar min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}

