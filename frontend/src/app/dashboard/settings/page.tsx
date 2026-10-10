'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Settings, 
  User, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw,
  Sliders
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { isHydrated, markHydrated } from '@/lib/data-cache';

export default function AccountSettingsPage() {
  // Synchronously initialize account details from localStorage (zero delay)
  const [name, setName] = useState(() => (isHydrated() && typeof window !== 'undefined' ? localStorage.getItem('user_name') || 'Administrator' : 'Administrator'));
  const [email, setEmail] = useState(() => (isHydrated() && typeof window !== 'undefined' ? localStorage.getItem('user_email') || 'admin@example.com' : 'admin@example.com'));
  const [companyName, setCompanyName] = useState(() => (isHydrated() && typeof window !== 'undefined' ? localStorage.getItem('company_name') || 'Enterprise Suite' : 'Enterprise Suite'));
  const [companyRole, setCompanyRole] = useState(() => (isHydrated() && typeof window !== 'undefined' ? localStorage.getItem('company_role') || 'Head of Analytics' : 'Head of Analytics'));
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Preference Toggles State
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState('30m');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [liveTelemetryAlerts, setLiveTelemetryAlerts] = useState(true);

  useEffect(() => {
    markHydrated();
    setName(localStorage.getItem('user_name') || 'Administrator');
    setEmail(localStorage.getItem('user_email') || 'admin@example.com');
    setCompanyName(localStorage.getItem('company_name') || 'Enterprise Suite');
    setCompanyRole(localStorage.getItem('company_role') || 'Head of Analytics');
  }, []);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user_name', name);
    localStorage.setItem('user_email', email);
    localStorage.setItem('company_name', companyName);
    localStorage.setItem('company_role', companyRole);
    setProfileSuccess('Account details saved successfully!');
    setTimeout(() => setProfileSuccess(''), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.post(`${API_BASE_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.status === 200 || res.status === 201) {
        setPasswordSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(''), 4000);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password. Check current password.';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-xs">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Account & Platform Settings</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
            Manage your account credentials, security preferences, background sync, and API integrations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Details & Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Profile Form */}
          <Card className="glass border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                Personal & Organization Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-gray-400">
                Update your visible profile name, contact email, and organization details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-5">
              {profileSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {profileSuccess}
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</Label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="rounded-xl bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="rounded-xl bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Name</Label>
                    <Input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="rounded-xl bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Job Role / Designation</Label>
                    <Input
                      type="text"
                      value={companyRole}
                      onChange={(e) => setCompanyRole(e.target.value)}
                      className="rounded-xl bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Account Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Security Form */}
          <Card className="glass border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                Change Account Password
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-gray-400">
                Keep your monitoring suite account secure by updating your password regularly
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-5">
              {passwordError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="rounded-xl bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800 text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="rounded-xl bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800 text-xs pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="rounded-xl bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-slate-800 text-xs pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={passwordLoading}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {passwordLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Platform Configuration & Preferences */}
        <div className="space-y-6">
          {/* Interface & Theme Preferences */}
          <Card className="glass border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-500" />
                Appearance & Theme Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Color Theme</h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">Switch between dark mode & light mode</p>
                </div>
                <ThemeToggle />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-gray-300 font-medium">Live Telemetry Alerts</span>
                  <input
                    type="checkbox"
                    checked={liveTelemetryAlerts}
                    onChange={(e) => setLiveTelemetryAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-gray-300 font-medium">Email Digest Reports</span>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Telemetry & Auto-Sync Settings */}
          <Card className="glass border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-500" />
                Background Sync Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Automated Sync</h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">Periodically poll live YouTube & LinkedIn data</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium text-slate-600 dark:text-gray-300">Sync Interval</Label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value)}
                  disabled={!autoSync}
                  className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 text-xs font-medium rounded-xl p-2 text-slate-900 dark:text-white"
                >
                  <option value="15m">Every 15 minutes</option>
                  <option value="30m">Every 30 minutes</option>
                  <option value="1h">Every 1 hour</option>
                  <option value="6h">Every 6 hours</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
