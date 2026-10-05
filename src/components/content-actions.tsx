'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Bookmark, Share2, Check, Plus, FolderHeart } from 'lucide-react';

interface ContentActionsProps {
  contentId: string;
  firstChapterId?: string;
  initialInLibrary: boolean;
  initialShelf?: string | null;
}

export function ContentActions({
  contentId,
  firstChapterId,
  initialInLibrary,
  initialShelf,
}: ContentActionsProps) {
  const { user, openLoginModal } = useAuth();
  const [inLibrary, setInLibrary] = useState(initialInLibrary);
  const [shelf, setShelf] = useState(initialShelf || 'CURRENTLY_READING');
  const [shelfPickerOpen, setShelfPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleShelfChange = async (newShelf: string) => {
    if (!user) {
      openLoginModal();
      return;
    }

    try {
      await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, shelf: newShelf }),
      });
      setInLibrary(true);
      setShelf(newShelf);
      setShelfPickerOpen(false);
    } catch {}
  };

  const handleBookmark = async () => {
    if (!user) {
      openLoginModal();
      return;
    }
    if (!firstChapterId) return;

    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          chapterId: firstChapterId,
          pageNumber: 1,
        }),
      });
      setBookmarked(true);
      setTimeout(() => setBookmarked(false), 2000);
    } catch {}
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Library Shelf Button & Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShelfPickerOpen(!shelfPickerOpen)}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            inLibrary
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FolderHeart className="w-4 h-4 text-emerald-400" />
          {inLibrary ? `In Library (${shelf.replace('_', ' ')})` : 'Add to Library'}
        </button>

        {shelfPickerOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-30 text-xs">
            {[
              { id: 'CURRENTLY_READING', label: 'Currently Reading' },
              { id: 'SAVED', label: 'Want to Read / Saved' },
              { id: 'COMPLETED', label: 'Completed' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => handleShelfChange(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  shelf === s.id && inLibrary
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bookmark button */}
      <button
        onClick={handleBookmark}
        className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-300 transition"
        title="Bookmark"
      >
        {bookmarked ? <Check className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
      </button>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-300 transition"
        title="Share link"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
