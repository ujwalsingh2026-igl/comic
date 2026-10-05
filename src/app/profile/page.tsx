'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  User,
  Shield,
  Download,
  Trash2,
  Lock,
  Mail,
  Phone,
  CheckCircle,
  Eye,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, openLoginModal, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [privacy, setPrivacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deletion modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users/me');
      const data = await res.json();
      if (data.success) {
        setProfile(data.data.user);
        setPrivacy(data.data.privacy || {});
        setName(data.data.user.name || '');
        setUsername(data.data.user.username || '');
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchProfile();
    else setLoading(false);
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Update failed');
      setMsg('Profile updated successfully.');
      fetchProfile();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePrivacy = async (field: string, val: boolean) => {
    try {
      const res = await fetch('/api/users/me/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: val }),
      });
      const data = await res.json();
      if (data.success) {
        setPrivacy(data.data);
      }
    } catch {}
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/users/me/export');
      const data = await res.json();
      if (data.success) {
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `novela-user-data-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Your account and personal data have been anonymized and removed.');
        window.location.href = '/';
      }
    } catch {} finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Sign In to View Profile</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Manage your personal details, privacy preferences, and security controls.
        </p>
        <button
          onClick={openLoginModal}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Account & Privacy Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Control your digital profile, visibility preferences, and data rights
        </p>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
          {msg}
        </div>
      )}

      {/* Profile Details Form */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Personal Profile</h2>
            <p className="text-xs text-slate-400">Update your public display name and handle</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Username Handle</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. reader_alex"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
          <div>
            <span className="text-slate-500">Email:</span> {profile?.email || 'Not connected'}
          </div>
          <div>
            <span className="text-slate-500">Phone:</span> {profile?.phone || 'Not connected'}
          </div>
          <div>
            <span className="text-slate-500">Role:</span> {profile?.role}
          </div>
          <div>
            <span className="text-slate-500">Member Since:</span>{' '}
            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Active'}
          </div>
        </div>
      </section>

      {/* Privacy Controls Section */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Privacy & Visibility Preferences</h2>
            <p className="text-xs text-slate-400">Fine-tune who can view your reading habits and activity</p>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {[
            {
              id: 'isProfilePublic',
              title: 'Public Profile',
              desc: 'Allow other readers to view your author followers and public bio',
            },
            {
              id: 'showReadingActivity',
              title: 'Share Reading Activity',
              desc: 'Display what comics and novels you are currently reading on your profile',
            },
            {
              id: 'showReviews',
              title: 'Public Community Reviews',
              desc: 'Allow your ratings and reviews to be visible to community members',
            },
            {
              id: 'allowPersonalization',
              title: 'Personalized Story Recommendations',
              desc: 'Use reading history to tailor homepage discovery feeds to your taste',
            },
            {
              id: 'allowMarketing',
              title: 'Special Offers & Newsletters',
              desc: 'Receive periodic updates on new releases and promotional discounts',
            },
          ].map((item) => (
            <div key={item.id} className="py-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!privacy?.[item.id]}
                  onChange={(e) => handleTogglePrivacy(item.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Data Export & Account Deletion */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white">Your Data & Rights (GDPR & CCPA)</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Download your personal records or initiate our legal retention-compliant deletion workflow
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleExportData}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            Download Personal Data (JSON)
          </button>

          <button
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/40 text-red-300 rounded-xl text-xs font-semibold transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            Delete Account
          </button>
        </div>
      </section>

      {/* Account Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base">Delete Account & Anonymize Data?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action will permanently terminate all active sessions and anonymize your personal identifying information (name, email, phone). In accordance with applicable financial regulations, past orders and payment receipts will be anonymized for accounting audit records.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Reason for leaving (optional)
              </label>
              <textarea
                rows={2}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Help us improve our service..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {deleting ? 'Anonymizing...' : 'Confirm Account Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
