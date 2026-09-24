'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Search, Shield } from 'lucide-react';
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage system access, manager credentials, and team authorization
          </p>
        </div>

        <Link
          href="/dashboard/users/add"
          prefetch={true}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs cursor-pointer transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New User</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              System Users
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {managers.length} registered system users
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
              <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">User</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Company</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Role</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Contact</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-300">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredManagers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <p className="text-xs">No users found matching your search.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredManagers.map((manager) => (
                  <TableRow key={manager.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {manager.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-slate-900 dark:text-white">
                            {manager.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {manager.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="font-medium block">{manager.companyName || '—'}</span>
                        <span className="text-[11px] text-slate-400">{manager.companyRole || ''}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 capitalize">
                        <Shield className="w-3 h-3" />
                        {manager.role?.replace('_', ' ') || 'Manager'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                      {manager.phone || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteManager(manager.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
