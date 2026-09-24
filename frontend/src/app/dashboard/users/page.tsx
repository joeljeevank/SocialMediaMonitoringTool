'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trash2, Plus, Search, Shield, Building2, Mail, Phone } from 'lucide-react';
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
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting manager', error);
      alert('Network error while deleting user');
    }
  };

  if (role !== 'super_admin') return null;

  const filteredManagers = managers.filter(m => 
    (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.companyName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage system access, manager credentials, and team authorization.
          </p>
        </div>

        <Link
          href="/dashboard/users/add"
          prefetch={true}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold h-10 px-4 rounded-xl shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New User</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              System Users
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {managers.length} active registered users
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 text-xs h-9 pl-9 pr-3 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
              <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">User</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">System Role</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Organization</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email Address</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredManagers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-400" />
                      <p className="font-semibold text-sm">No users found</p>
                      <p className="text-xs text-slate-400">Add a new manager to grant them access.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredManagers.map(m => (
                  <TableRow key={m.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center flex-shrink-0">
                          {m.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-slate-900 dark:text-white">{m.name}</p>
                          <p className="text-[11px] text-slate-400">ID #{m.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 capitalize">
                        <Shield className="w-3 h-3" />
                        {m.role?.replace('_', ' ') || 'User'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.companyName || 'N/A'}</span>
                        {m.companyRole && <span className="text-slate-400">({m.companyRole})</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.phone || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteManager(m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
