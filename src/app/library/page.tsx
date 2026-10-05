'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ContentCard } from '@/components/content-card';
import { Bookmark, BookOpen, Trash2, CheckCircle2 } from 'lucide-react';

export default function LibraryPage() {
  const { user, openLoginModal } = useAuth();
  const [activeShelf, setActiveShelf] = useState<'CURRENTLY_READING' | 'COMPLETED' | 'SAVED' | 'PURCHASED'>('CURRENTLY_READING');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLibrary = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/library?shelf=${activeShelf}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLibrary();
    } else {
      setLoading(false);
    }
  }, [user, activeShelf]);

  const handleRemove = async (contentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/library/${contentId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.contentId !== contentId));
    } catch {}
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <Bookmark className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Sign In to View Your Library</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Keep track of your reading progress, bookmark chapters, and access purchased audiobooks.
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          My Library
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal shelves and pick up right where you left off
        </p>
      </div>

      {/* Shelves Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'CURRENTLY_READING', label: 'Currently Reading' },
          { id: 'SAVED', label: 'Saved / Want to Read' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'PURCHASED', label: 'Purchased Titles' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveShelf(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeShelf === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Items */}
      {loading ? (
        <div className="py-20 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading library...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-slate-900/30 border border-slate-800 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-200">This shelf is empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Discover trending comics, novels, and audiobooks to add to your personal library.
          </p>
          <Link
            href="/search"
            className="inline-block mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl transition"
          >
            Discover Titles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              <ContentCard
                id={item.contentId}
                title={item.title}
                slug={item.slug}
                contentType={item.contentType}
                coverUrl={item.coverUrl}
                authorName={item.authorName}
                ratingAverage={item.ratingAverage}
              />

              {/* Progress bar overlay */}
              {(item.readingPercent > 0 || item.listeningPercent > 0) && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{
                        width: `${item.readingPercent || item.listeningPercent}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{item.readingPercent || item.listeningPercent}% read</span>
                    <button
                      onClick={(e) => handleRemove(item.contentId, e)}
                      className="text-slate-500 hover:text-red-400 transition"
                      title="Remove from library"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
