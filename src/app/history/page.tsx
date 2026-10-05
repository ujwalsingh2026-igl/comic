'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Compass, Trash2, Calendar, BookOpen, Clock } from 'lucide-react';

export default function HistoryPage() {
  const { user, openLoginModal } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reading/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchHistory();
    else setLoading(false);
  }, [user]);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your reading and listening history?')) return;
    try {
      await fetch('/api/reading/history', { method: 'DELETE' });
      setHistory([]);
    } catch {}
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Sign In to View History</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Sign in to view your recent reading and listening sessions across all devices.
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Reading & Listening History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Chronological log of your finished and in-progress stories
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 bg-red-950/40 border border-red-900/60 hover:bg-red-900/40 text-red-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-slate-900/30 border border-slate-800 rounded-3xl">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-bold text-base text-slate-200">No reading history recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When you read comics or listen to audiobooks, your progress will be listed here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
          {history.map((item) => {
            const readerPath =
              item.contentType === 'AUDIOBOOK'
                ? `/listen/${item.slug}/${item.chapterNumber}`
                : item.contentType === 'NOVEL'
                ? `/read/novel/${item.slug}/${item.chapterNumber}`
                : `/read/comic/${item.slug}/${item.chapterNumber}`;

            return (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-12 h-16 object-cover rounded-lg bg-slate-950 shrink-0"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/content/${item.slug}`}
                      className="font-bold text-sm text-slate-100 hover:text-indigo-300 transition truncate block"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      Chapter {item.chapterNumber}: {item.chapterTitle}
                    </p>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.lastReadAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {Math.round(item.percentCompleted)}%
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {item.contentType === 'COMIC' ? `Page ${item.pageNumber}` : 'Completed'}
                    </p>
                  </div>

                  <Link
                    href={readerPath}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow"
                  >
                    Continue
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
