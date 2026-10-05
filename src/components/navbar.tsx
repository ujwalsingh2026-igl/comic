'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
  BookOpen,
  Headphones,
  Compass,
  Bookmark,
  Bell,
  Search,
  User as UserIcon,
  LogOut,
  Shield,
  Menu,
  X,
  CreditCard,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const { user, openLoginModal, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetch('/api/notifications')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setNotifications(data.data.notifications || []);
            setUnreadCount(data.data.unreadCount || 0);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              NOVELA<span className="text-indigo-400">.</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition"
            >
              Explore
            </Link>
            <Link
              href="/search?type=COMIC"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition"
            >
              Comics
            </Link>
            <Link
              href="/search?type=NOVEL"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition"
            >
              Novels
            </Link>
            <Link
              href="/search?type=AUDIOBOOK"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
            >
              <Headphones className="w-4 h-4 text-pink-400" />
              Audiobooks
            </Link>
            <Link
              href="/pricing"
              className="px-3 py-1.5 rounded-lg hover:text-amber-300 text-amber-400 font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Premium
            </Link>
          </nav>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </Link>

          {user ? (
            <>
              {/* Library link */}
              <Link
                href="/library"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition"
              >
                <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                My Library
              </Link>

              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full ring-2 ring-slate-950" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 z-50">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="font-semibold text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[11px] text-indigo-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto mt-2 space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">No notifications yet</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border transition ${
                              n.isRead
                                ? 'bg-slate-950/40 border-slate-800/40 text-slate-400'
                                : 'bg-slate-800/40 border-slate-700/60 text-slate-100 font-medium'
                            }`}
                          >
                            <p className="text-xs font-bold">{n.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:ring-2 hover:ring-slate-700 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300 overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 text-xs text-slate-200 z-50">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="font-semibold text-sm text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email || user.phone}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                        {user.role}
                      </span>
                    </div>

                    <Link
                      href="/library"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Bookmark className="w-4 h-4 text-slate-400" />
                      My Library
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      Profile & Privacy
                    </Link>

                    <Link
                      href="/history"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Compass className="w-4 h-4 text-slate-400" />
                      Reading History
                    </Link>

                    <Link
                      href="/pricing"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition text-amber-400"
                    >
                      <CreditCard className="w-4 h-4" />
                      Subscription & Plans
                    </Link>

                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-950/60 text-indigo-300 transition"
                      >
                        <Shield className="w-4 h-4 text-indigo-400" />
                        Admin Dashboard
                      </Link>
                    )}

                    <div className="border-t border-slate-800 mt-1 pt-1">
                      <button
                        onClick={() => { setUserDropdownOpen(false); logout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-950/50 text-red-400 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={openLoginModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-indigo-600/20"
            >
              Sign In
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-xl transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200"
          >
            Explore
          </Link>
          <Link
            href="/search?type=COMIC"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200"
          >
            Comics
          </Link>
          <Link
            href="/search?type=NOVEL"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200"
          >
            Novels
          </Link>
          <Link
            href="/search?type=AUDIOBOOK"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200"
          >
            Audiobooks
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-amber-400 hover:bg-slate-800"
          >
            Premium Subscriptions
          </Link>
          {user && (
            <Link
              href="/library"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200"
            >
              My Library
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
