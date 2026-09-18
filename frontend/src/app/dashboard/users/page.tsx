'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trash2, Plus, Search, Shield, Building, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UserManagementPage() {
  const router = useRouter();
  const [managers, setManagers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    setRole(userRole || '');
    if (userRole !== 'super_admin') {
      router.push('/dashboard');
    } else {
      fetchManagers();
    }
  }, [router]);

  const fetchManagers = async () => {
    try {
      const res = await fetch('http://localhost:3001/managers');
      if (res.ok) {
        const data = await res.json();
        setManagers(data);
      }
    } catch (error) {
      console.error('Failed to fetch managers', error);
    }
  };

  const handleDeleteManager = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? They will no longer be able to log in.')) return;
    
    try {
      const res = await fetch(`http://localhost:3001/managers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchManagers();
      } else {
        alert('Failed to delete manager');
      }
    } catch (error) {
      console.error('Error deleting manager', error);
      alert('Network error while deleting manager');
    }
  };

  if (role !== 'super_admin') return null;

  const filteredManagers = managers.filter(m => 
    (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.companyName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <span>User Management</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Authorize team members, managers, and system administrators
          </p>
        </div>

        <Button asChild className="bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-bold h-11 px-6 rounded-2xl shadow-lg shadow-cyan-500/25 border-none transition-all cursor-pointer">
          <Link href="/dashboard/users/add" prefetch={true}>
            <Plus className="w-4 h-4 mr-2" />
            Add New User
          </Link>
        </Button>
      </div>

      <Card className="bg-white/90 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>All Registered Users</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20">
              {managers.length}
            </span>
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 h-9 pl-9 pr-3.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-white/5">
              <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-300">User</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-300">System Role</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-300">Company & Role</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-300">Contact Email</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-300">Phone</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredManagers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-400" />
                      <p className="font-semibold text-sm">No users found</p>
                      <p className="text-xs text-slate-400">Add a new manager or user to grant them access to MonitorHQ.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredManagers.map(m => (
                  <TableRow key={m.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-cyan-500/5 transition-colors">
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                          {m.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{m.name}</p>
                          <p className="text-[11px] text-slate-400">ID: #{m.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        <Shield className="w-3 h-3" />
                        {m.role?.replace('_', ' ') || 'User'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300">
                      <p className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                        <Building className="w-3 h-3 text-cyan-400" />
                        {m.companyName || '-'}
                      </p>
                      <p className="text-[11px] text-slate-400">{m.companyRole || '-'}</p>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300 text-xs">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {m.email}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300 text-xs">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {m.phone || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteManager(m.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

