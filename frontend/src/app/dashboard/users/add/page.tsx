'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
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
  const [managerRole, setManagerRole] = useState('user');
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
        setManagerRole('user');
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
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Register New User
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Add team members or managers with system credentials
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        {managerSuccess && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{managerSuccess}</span>
          </div>
        )}

        {managerError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{managerError}</span>
          </div>
        )}

        <form onSubmit={handleAddManager} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Full Name
            </Label>
            <Input
              type="text"
              placeholder="e.g. John Doe"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              required
              className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Company / Organization
              </Label>
              <Input
                type="text"
                placeholder="e.g. Acme Media"
                value={managerCompany}
                onChange={(e) => setManagerCompany(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Position / Job Title
              </Label>
              <Input
                type="text"
                placeholder="e.g. Marketing Lead"
                value={managerCompanyRole}
                onChange={(e) => setManagerCompanyRole(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </Label>
              <Input
                type="email"
                placeholder="user@domain.com"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                required
                className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Phone Number
              </Label>
              <Input
                type="tel"
                placeholder="+1 555-0199"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              System Authorization Level
            </Label>
            <select
              value={managerRole}
              onChange={(e) => setManagerRole(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white h-10 px-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="user">User (Standard Access)</option>
              <option value="manager">Manager (Elevated Controls)</option>
              <option value="super_admin">Super Admin (Full Control)</option>
            </select>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={managerAddLoading}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 rounded-xl"
            >
              {managerAddLoading ? 'Creating Account...' : 'Create User Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
