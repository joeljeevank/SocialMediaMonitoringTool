'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trash2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UserManagementPage() {
  const router = useRouter();
  const [managers, setManagers] = useState<any[]>([]);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            Registered Users
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">View and manage all users in the system.</p>
        </div>
        <Button asChild className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-slate-900 dark:text-white font-bold h-11 px-6 rounded-xl shadow-lg border-none">
          <Link href="/dashboard/users/add">
            <Plus className="w-5 h-5 mr-2" />
            Add New User
          </Link>
        </Button>
      </div>

      <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-purple-500/50 shadow-xl overflow-hidden h-fit">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-purple-900/10">
              <TableRow className="border-b border border-purple-200 dark:border-purple-500/50">
                <TableHead className="text-purple-700 dark:text-purple-300">Name</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300">System Role</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300">Company</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300">Company Role</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300">Email</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300">Phone</TableHead>
                <TableHead className="text-right text-purple-700 dark:text-purple-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">No users found.</TableCell>
                </TableRow>
              ) : (
                managers.map(m => (
                  <TableRow key={m.id} className="border-b border border-purple-200 dark:border-purple-500/50 hover:bg-purple-500/5 transition-colors">
                    <TableCell className="font-medium text-slate-900 dark:text-white">{m.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 capitalize">
                        {m.role?.replace('_', ' ') || 'User'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300">{m.companyName}</TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300">{m.companyRole || '-'}</TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300">{m.email}</TableCell>
                    <TableCell className="text-slate-600 dark:text-gray-300">{m.phone}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteManager(m.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
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
