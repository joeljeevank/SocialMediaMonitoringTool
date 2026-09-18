'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserPlus, User, Building, Briefcase, Shield, Phone, Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddUserPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  
  // New Manager Form State
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
        setManagerSuccess(`Account created for ${managerName}! An automated credentials email has been dispatched to ${managerEmail}.`);
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
    <div className="space-y-6 max-w-2xl mx-auto select-none">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <Link href="/dashboard/users" prefetch={true}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <UserPlus className="w-6 h-6 text-cyan-400" />
              <span>Register New User</span>
            </h1>
            <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
              Create manager or admin accounts with platform access
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-white/90 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            User Credentials & Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          {managerSuccess && (
            <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold">Account Created</p>
                <p className="mt-0.5 opacity-90">{managerSuccess}</p>
              </div>
            </div>
          )}
          {managerError && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold">Creation Failed</p>
                <p className="mt-0.5 opacity-90">{managerError}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleAddManager} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Full Name
              </Label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 h-11 px-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-cyan-400" />
                  Company Name
                </Label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={managerCompany}
                  onChange={(e) => setManagerCompany(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 h-11 px-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  Company Role / Title
                </Label>
                <input
                  type="text"
                  placeholder="e.g. Marketing Director"
                  value={managerCompanyRole}
                  onChange={(e) => setManagerCompanyRole(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 h-11 px-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  System Role
                </Label>
                <select 
                  value={managerRole} 
                  onChange={(e) => setManagerRole(e.target.value)} 
                  required 
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white h-11 px-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm cursor-pointer"
                >
                  <option value="user" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">User (Manager View)</option>
                  <option value="super_admin" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Super Admin (Full Access)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  Phone Number
                </Label>
                <input
                  type="text"
                  placeholder="+1 555 0192"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 h-11 px-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Login Email Address
              </Label>
              <input
                type="email"
                placeholder="name@company.com"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 h-11 px-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
              />
            </div>

            <Button 
              type="submit" 
              disabled={managerAddLoading}
              className="w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-cyan-500/25 border-none mt-4 transition-all cursor-pointer"
            >
              {managerAddLoading ? 'Creating User Account...' : 'Create Account & Send Credentials'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

