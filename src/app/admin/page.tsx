'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  Shield,
  Users,
  DollarSign,
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'METRICS' | 'USERS' | 'CONTENT' | 'ORDERS' | 'AUDIT'>('METRICS');
  const [loading, setLoading] = useState(true);

  // User management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Content creation modal state
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [contentTitle, setContentTitle] = useState('');
  const [contentSlug, setContentSlug] = useState('');
  const [contentDesc, setContentDesc] = useState('');
  const [contentType, setContentType] = useState<'COMIC' | 'NOVEL' | 'AUDIOBOOK'>('COMIC');
  const [contentCover, setContentCover] = useState('');
  const [contentIsPremium, setContentIsPremium] = useState(false);
  const [contentPrice, setContentPrice] = useState(0);

  // Refund state
  const [refundOrderId, setRefundOrderId] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      if (data.success) {
        setUsersList(data.data || []);
      }
    } catch {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      fetchMetrics();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'AUDIT') fetchAuditLogs();
  }, [activeTab, userSearch]);

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch {}
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Pick author from metrics or default
      const authorId = metrics?.recentOrders?.[0]?.authorId || '00000000-0000-0000-0000-000000000001';
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: contentTitle,
          slug: contentSlug,
          description: contentDesc,
          contentType,
          authorId,
          coverUrl: contentCover,
          isPremium: contentIsPremium,
          priceCents: contentPrice * 100,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Content created successfully!');
        setContentModalOpen(false);
        fetchMetrics();
      } else {
        alert(data.error?.message || 'Failed to create');
      }
    } catch {}
  };

  const handleProcessRefund = async (orderId: string, amountCents: number) => {
    if (!confirm(`Are you sure you want to refund ₹${(amountCents / 100).toFixed(2)} and revoke user access?`)) return;

    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amountCents,
          reason: 'Admin approved refund',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Refund processed successfully and entitlements revoked.');
        fetchMetrics();
      } else {
        alert(data.error?.message || 'Refund failed');
      }
    } catch {}
  };

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <Shield className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400">
          You do not have administrative privileges to view this panel.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/30">
            <Shield className="w-3.5 h-3.5" />
            <span>Administrator Control Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
            Operations & Analytics Dashboard
          </h1>
        </div>

        <button
          onClick={() => setContentModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
        >
          <Plus className="w-4 h-4" />
          Publish New Content
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'METRICS', label: 'Platform Metrics' },
          { id: 'USERS', label: 'User Governance' },
          { id: 'ORDERS', label: 'Orders & Refunds' },
          { id: 'AUDIT', label: 'Security Audit Logs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Metrics View */}
      {activeTab === 'METRICS' && metrics && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Total Registered Users</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{metrics.users.total}</p>
              <p className="text-[11px] text-emerald-400 font-semibold">{metrics.users.active} active accounts</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Total Platform Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white">
                ₹{(metrics.revenue.totalRevenueCents / 100).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">
                {metrics.revenue.successfulOrders} verified orders
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Active VIP Subscriptions</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white">{metrics.activeSubscriptions}</p>
              <p className="text-[11px] text-slate-400">Monthly & Annual VIPs</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Suspended Accounts</span>
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-2xl font-black text-white">{metrics.users.suspended}</p>
              <p className="text-[11px] text-slate-400">Violations & safety holds</p>
            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white">Recent Transactions</h3>
            <div className="divide-y divide-slate-800/80 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] uppercase text-slate-500 pb-2">
                  <tr>
                    <th className="py-2">Order #</th>
                    <th className="py-2">User</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {metrics.recentOrders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30">
                      <td className="py-3 font-mono font-bold text-indigo-300">{ord.orderNumber}</td>
                      <td className="py-3">{ord.userName} ({ord.userEmail})</td>
                      <td className="py-3 font-bold text-white">₹{(ord.amountCents / 100).toFixed(2)}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Governance View */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-w-md">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name, email, or handle..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
            />
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase text-slate-500 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-white">{u.name}</td>
                    <td className="p-3">{u.email || u.phone || 'N/A'}</td>
                    <td className="p-3 font-semibold text-indigo-400">{u.role}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {u.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                            u.status === 'ACTIVE'
                              ? 'bg-red-950/40 text-red-400 hover:bg-red-900/40'
                              : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders & Refunds View */}
      {activeTab === 'ORDERS' && metrics && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Only verified successful payments are eligible for automated entitlement revocation and refunds.
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase text-slate-500 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Refund Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metrics.recentOrders.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono font-bold text-indigo-300">{ord.orderNumber}</td>
                    <td className="p-3">{ord.userName}</td>
                    <td className="p-3 font-bold text-white">₹{(ord.amountCents / 100).toFixed(2)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {ord.status === 'SUCCESS' && (
                        <button
                          onClick={() => handleProcessRefund(ord.id, ord.amountCents)}
                          className="px-3 py-1 bg-red-950/40 text-red-300 border border-red-900/40 rounded-lg text-[11px] font-bold hover:bg-red-900/40 transition flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Audit Logs View */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase text-slate-500 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">User Context</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-indigo-300">{log.action}</td>
                    <td className="p-3 text-slate-400">{log.resource}</td>
                    <td className="p-3">{log.userName || log.userEmail || 'Anonymous'}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Publishing Modal */}
      {contentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-white">Publish New Content Work</h3>

            <form onSubmit={handleCreateContent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={contentTitle}
                  onChange={(e) => {
                    setContentTitle(e.target.value);
                    setContentSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={contentSlug}
                  onChange={(e) => setContentSlug(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Format Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                >
                  <option value="COMIC">Comic / Webtoon</option>
                  <option value="NOVEL">Novel / Web Fiction</option>
                  <option value="AUDIOBOOK">Audiobook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  required
                  value={contentCover}
                  onChange={(e) => setContentCover(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={contentDesc}
                  onChange={(e) => setContentDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={contentIsPremium}
                    onChange={(e) => setContentIsPremium(e.target.checked)}
                  />
                  <span>Premium (Paid) Content</span>
                </label>

                {contentIsPremium && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Price (INR):</span>
                    <input
                      type="number"
                      value={contentPrice}
                      onChange={(e) => setContentPrice(parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setContentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white shadow"
                >
                  Publish Content
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
