'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  UserPlus, 
  User, 
  FileText,
  BarChart3,
  ChevronRight,
  Menu,
  X,
  Shield
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

  // My Profile is placed FIRST, and Settings has been removed as requested
  const navItems = [
    {
      href: '/dashboard/profile',
      label: 'My Profile',
      icon: User,
      active: pathname === '/dashboard/profile',
      color: 'text-indigo-500',
    },
    {
      href: '/dashboard',
      label: 'LinkedIn Overview',
      icon: LayoutDashboard,
      active: pathname === '/dashboard' || (pathname.startsWith('/dashboard/') && !['/dashboard/youtube', '/dashboard/profile', '/dashboard/users', '/dashboard/reports', '/dashboard/settings', '/dashboard/company'].some(p => pathname.startsWith(p))),
      color: 'text-blue-500',
    },
    {
      href: '/dashboard/youtube',
      label: 'YouTube Analytics',
      icon: YoutubeIcon,
      active: pathname.startsWith('/dashboard/youtube'),
      badge: 'Live',
      color: 'text-red-500',
    },
    ...(userRole === 'super_admin' ? [
      {
        href: '/dashboard/users',
        label: 'User Management',
        icon: Users,
        active: pathname === '/dashboard/users',
        color: 'text-purple-500',
      },
      {
        href: '/dashboard/users/add',
        label: 'Add New User',
        icon: UserPlus,
        active: pathname === '/dashboard/users/add',
        color: 'text-emerald-500',
      },
    ] : []),
    {
      href: '/dashboard/reports',
      label: 'Reports & Export',
      icon: FileText,
      active: pathname === '/dashboard/reports',
      color: 'text-amber-500',
    },
  ];

  const getPageTitle = () => {
    if (pathname === '/dashboard/profile') return 'My Profile';
    if (pathname === '/dashboard') return 'LinkedIn Overview';
    if (pathname.startsWith('/dashboard/youtube')) return 'YouTube Analytics';
    if (pathname === '/dashboard/users') return 'User Management';
    if (pathname === '/dashboard/users/add') return 'Add System User';
    if (pathname === '/dashboard/reports') return 'Analytics Reports';
    if (pathname.startsWith('/dashboard/')) return 'Profile Analytics';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Professional Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Link href="/dashboard/profile" prefetch={true} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block">
                SocialPulse
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                Monitoring Suite
              </span>
            </div>
          </Link>
          <button 
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
                  item.active
                    ? 'bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600 dark:border-indigo-500'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    item.active 
                      ? 'bg-white dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer: User Identity Card & Sign Out */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              {userName.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {userName}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">
                <Shield className="w-3 h-3 text-indigo-500" />
                <span>{userRole?.replace('_', ' ') || 'User'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">MonitorHQ</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:inline" />
              <h1 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Collector Live</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Scroll Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-[#0B0F19]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
