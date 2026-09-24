'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, ArrowLeft, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    setRole(userRole || '');
    if (userRole !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [router]);

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setManagerAddLoading(true);
    setManagerSuccess('');
    setManagerError('');
    try {
      const res = await fetch('http://localhost:3001/managers', {
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
        setManagerSuccess(`User ${managerName} registered successfully! Credentials have been sent.`);
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
                placeholder="e.g. Alex Mercer"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-9 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mgr-email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </Label>
              <Input
                id="mgr-email"
                type="email"
                placeholder="e.g. alex@example.com"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-9 rounded-lg"
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
                placeholder="e.g. Acme Corp"
                value={managerCompany}
                onChange={(e) => setManagerCompany(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-9 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mgr-company-role" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Company Job Title
              </Label>
              <Input
                id="mgr-company-role"
                type="text"
                placeholder="e.g. Social Lead"
                value={managerCompanyRole}
                onChange={(e) => setManagerCompanyRole(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-9 rounded-lg"
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
                placeholder="e.g. +1 555-0199"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="bg-slate-50 dark:bg-[#090d16] border-slate-200 dark:border-slate-700 text-xs h-9 rounded-lg"
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
                className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="manager">Manager (Read & Analytics)</option>
                <option value="super_admin">Super Admin (Full System Access)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <Link href="/dashboard/users">
              <Button
                type="button"
                variant="outline"
                className="text-xs h-9 px-4 rounded-lg"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={managerAddLoading}
              className="text-xs h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1.5 font-semibold"
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
