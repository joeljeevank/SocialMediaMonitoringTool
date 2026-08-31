'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
          name: managerName,
          companyName: managerCompany,
          companyRole: managerCompanyRole,
          phone: managerPhone,
          email: managerEmail,
          role: managerRole,
        }),
      });
      if (res.ok) {
        setManagerSuccess(`Success! Account created for ${managerName}. An email with the login credentials has been sent to ${managerEmail}.`);
        setManagerName('');
        setManagerCompany('');
        setManagerCompanyRole('');
        setManagerPhone('');
        setManagerEmail('');
        setManagerRole('user');
      } else {
        const errorData = await res.json();
        setManagerError(errorData.message || 'Failed to create user.');
      }
    } catch (error) {
      console.error('Failed to add user', error);
      setManagerError('A network error occurred. Is the backend running?');
    }
    setManagerAddLoading(false);
  };

  if (role !== 'super_admin') return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            Add New User
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Create a new user account in the system.</p>
        </div>
      </div>

      <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-purple-500/50 shadow-xl">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            User Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {managerSuccess && (
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.15)] flex flex-col gap-1 animate-in slide-in-from-top-2">
              <span className="font-bold text-emerald-400">Account Created</span>
              <span className="text-emerald-300/80 text-sm">{managerSuccess}</span>
            </div>
          )}
          {managerError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.15)] flex flex-col gap-1 animate-in slide-in-from-top-2">
              <span className="font-bold text-red-400">Registration Failed</span>
              <span className="text-red-300/80 text-sm">{managerError}</span>
            </div>
          )}
          <form onSubmit={handleAddManager} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-gray-300 font-medium">Full Name</Label>
              <Input value={managerName} onChange={e => setManagerName(e.target.value)} required className="bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white h-11 px-4 rounded-xl focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-gray-300 font-medium">Company Name</Label>
                <Input value={managerCompany} onChange={e => setManagerCompany(e.target.value)} required className="bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white h-11 px-4 rounded-xl focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-gray-300 font-medium">Company Role</Label>
                <Input value={managerCompanyRole} onChange={e => setManagerCompanyRole(e.target.value)} placeholder="e.g. Marketing Director" required className="bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white h-11 px-4 rounded-xl focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-gray-300 font-medium">System Role</Label>
                <select 
                  value={managerRole} 
                  onChange={e => setManagerRole(e.target.value)} 
                  required 
                  className="w-full bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white h-11 px-4 rounded-xl focus:ring-2 focus:ring-purple-500 appearance-none outline-none"
                >
                  <option value="user" className="bg-slate-50 dark:bg-[#090014]">User</option>
                  <option value="super_admin" className="bg-slate-50 dark:bg-[#090014]">Super Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-gray-300 font-medium">Phone</Label>
                <Input value={managerPhone} onChange={e => setManagerPhone(e.target.value)} required className="bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white h-11 px-4 rounded-xl focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-gray-300 font-medium">Email (Username)</Label>
              <Input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} required className="bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white h-11 px-4 rounded-xl focus:ring-2 focus:ring-purple-500" />
            </div>
            <Button type="submit" disabled={managerAddLoading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-slate-900 dark:text-white font-bold h-11 rounded-xl shadow-lg border-none mt-4">
              {managerAddLoading ? 'Creating...' : 'Create User & Send Email'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
