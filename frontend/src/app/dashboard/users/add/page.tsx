'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, ArrowLeft, UserPlus, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api-config';

export default function AddUserPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  
  const [managerName, setManagerName] = useState('');
  const [managerCompany, setManagerCompany] = useState('');
  const [managerCompanyRole, setManagerCompanyRole] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerRole, setManagerRole] = useState('manager');
  const [managerAddLoading, setManagerAddLoading] = useState(false);
  const [managerSuccess, setManagerSuccess] = useState('');
  const [managerError, setManagerError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password?: string;
    emailSent: boolean;
    emailError?: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    setRole(userRole || '');
    if (userRole !== 'super_admin') {
      router.push('/dashboard/profile');
    }
  }, [router]);

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setManagerAddLoading(true);
    setManagerSuccess('');
    setManagerError('');
    setCreatedCredentials(null);

    try {
      const res = await fetch(`${API_BASE_URL}/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: managerName.trim(),
          companyName: managerCompany.trim(),
          companyRole: managerCompanyRole.trim(),
          phone: managerPhone.trim(),
          email: managerEmail.trim(),
          role: managerRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedCredentials({
          email: data.email || managerEmail.trim(),
          password: data.generatedPassword || data.password,
          emailSent: !!data.emailSent,
          emailError: data.emailError,
        });

        setManagerSuccess(`User ${managerName} registered successfully! Login credentials have been sent to ${data.email}.`);

        setManagerName('');
        setManagerCompany('');
        setManagerCompanyRole('');
        setManagerPhone('');
        setManagerEmail('');
        setManagerRole('manager');
      } else {
        const errorData = await res.json().catch(() => ({}));
        setManagerError(errorData.message || 'Failed to create user account.');
      }
    } catch {
      setManagerError('Network error occurred. Unable to communicate with the backend server.');
    } finally {
      setManagerAddLoading(false);
    }
  };

  if (role !== 'super_admin') return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/users"
          prefetch={true}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Register New User
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Add team members or managers with system credentials
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs">
        {managerSuccess && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{managerSuccess}</span>
          </div>
        )}

        {createdCredentials && (
          <div className="mb-6 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                Generated Login Credentials
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Credentials Generated ✓
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900">
              <div>
                <span className="text-slate-400 text-[10px] block">Username / Email</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-medium select-all">
                  {createdCredentials.email}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Temporary Password</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold select-all">
                  {createdCredentials.password || 'Saved securely'}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Credentials dispatched to user. You can also copy them below as backup.
              </p>
              {createdCredentials.password && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Username: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {managerError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{managerError}</span>
          </div>
        )}

        <form onSubmit={handleAddManager} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mgr-name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </Label>
              <Input
                id="mgr-name"
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-10 px-3.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mgr-email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </Label>
              <Input
                id="mgr-email"
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-10 px-3.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mgr-company" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Company Name
              </Label>
              <Input
                id="mgr-company"
                type="text"
                value={managerCompany}
                onChange={(e) => setManagerCompany(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-10 px-3.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mgr-company-role" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Company Job Title
              </Label>
              <Input
                id="mgr-company-role"
                type="text"
                value={managerCompanyRole}
                onChange={(e) => setManagerCompanyRole(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-10 px-3.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mgr-phone" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Phone Number
              </Label>
              <Input
                id="mgr-phone"
                type="text"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-10 px-3.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mgr-role" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                System Access Level
              </Label>
              <select
                id="mgr-role"
                value={managerRole}
                onChange={(e) => setManagerRole(e.target.value)}
                className="w-full h-10 px-3.5 text-xs bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="manager">Manager (Read & Analytics)</option>
                <option value="super_admin">Super Admin (Full System Access)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <Link
              href="/dashboard/users"
              className="inline-flex items-center justify-center text-xs h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={managerAddLoading}
              className="text-xs h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5 font-semibold cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{managerAddLoading ? 'Creating User...' : 'Create Account'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
