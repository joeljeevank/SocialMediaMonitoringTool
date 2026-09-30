'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  User, 
  FileText,
  BarChart3,
  ChevronRight,
  Menu,
  X,
  Shield,
  Home,
  Settings
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { YoutubeIcon } from '@/components/icons/youtube-icon';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Administrator');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [optimisticPathname, setOptimisticPathname] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      router.push('/');
    } else {
      setUserRole(localStorage.getItem('user_role'));
      setUserName(localStorage.getItem('user_name') || 'Administrator');
    }

    // Prefetch all key dashboard routes for instant sub-second transitions
    router.prefetch('/dashboard/profile');
    router.prefetch('/dashboard');
    router.prefetch('/dashboard/youtube');
    router.prefetch('/dashboard/reports');
    router.prefetch('/dashboard/users');
    router.prefetch('/dashboard/users/add');
    router.prefetch('/dashboard/settings');
  }, [router]);

  // Clear optimistic pathname when navigation completes
  useEffect(() => {
    setOptimisticPathname(null);
    setIsNavigating(false);
  }, [pathname]);

  const activePath = optimisticPathname ?? pathname;

  const navItems: Array<{ href: string; label: string; icon: any; active: boolean; badge?: string }> = [
    {
      href: '/dashboard',
      label: 'LinkedIn Overview',
      icon: LayoutDashboard,
      active: activePath === '/dashboard',
    },
    {
      href: '/dashboard/youtube',
      label: 'YouTube Analytics',
      icon: YoutubeIcon,
      active: activePath.startsWith('/dashboard/youtube'),
    },
    {
      href: '/dashboard/profile',
      label: 'My Profile',
      icon: User,
      active: activePath === '/dashboard/profile',
    },
    ...(userRole === 'super_admin' ? [
      {
        href: '/dashboard/users',
        label: 'User Management',
        icon: Users,
        active: activePath === '/dashboard/users',
      },
    ] : []),
    {
      href: '/dashboard/reports',
      label: 'Reports & Export',
      icon: FileText,
      active: activePath === '/dashboard/reports',
    },
    {
      href: '/dashboard/settings',
      label: 'Account Settings',
      icon: Settings,
      active: activePath === '/dashboard/settings',
    },
  ];

  const prefetchRoute = (href: string) => {
    try {
      router.prefetch(href);
    } catch {}
  };

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (href !== pathname) {
      setOptimisticPathname(href);
      setIsNavigating(true);
      startTransition(() => {
        router.push(href);
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('company_name');
    localStorage.removeItem('company_role');
    router.push('/');
  };

  const getPageTitle = () => {
    if (activePath === '/dashboard') return 'LinkedIn Monitoring';
    if (activePath.startsWith('/dashboard/youtube')) return 'YouTube Intelligence';
    if (activePath === '/dashboard/profile') return 'Account Profile';
    if (activePath === '/dashboard/users') return 'User Management';
    if (activePath === '/dashboard/users/add') return 'Add System User';
    if (activePath === '/dashboard/reports') return 'Analytics Reports';
    if (activePath === '/dashboard/settings') return 'Platform Settings';
    if (activePath.startsWith('/dashboard/')) return 'Profile Analytics';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#06080e] p-3 sm:p-4 md:p-6 gap-4 sm:gap-6 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation Loading Indicator */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
      )}

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800/90 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <Link 
            href="/dashboard" 
            prefetch={true} 
            onMouseEnter={() => prefetchRoute('/dashboard')}
            onFocus={() => prefetchRoute('/dashboard')}
            onClick={() => handleNavClick('/dashboard')}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  SocialPulse
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block -mt-0.5 font-medium">
                Monitoring Suite
              </span>
            </div>
          </Link>
          <button 
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                onPointerDown={() => prefetchRoute(item.href)}
                onTouchStart={() => prefetchRoute(item.href)}
                onClick={() => handleNavClick(item.href)}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
                  item.active
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-700 dark:text-cyan-300 font-bold border-indigo-600 dark:border-cyan-400 border-l-2 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/90 hover:text-slate-900 dark:hover:text-cyan-300 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-colors ${
                    item.active 
                      ? 'text-indigo-600 dark:text-cyan-400' 
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-cyan-300'
                  }`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {userName.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {userName}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 capitalize truncate">
                <Shield className="w-3 h-3 text-indigo-500" />
                <span>{userRole?.replace('_', ' ') || 'User'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
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
        <header className="h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hidden sm:flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:inline" />
              <h1 className="font-semibold text-slate-900 dark:text-white text-sm">
                {getPageTitle()}
              </h1>
            </div>
          </div>


        </header>

        {/* Dynamic Page Scroll Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-[#090d16] custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
