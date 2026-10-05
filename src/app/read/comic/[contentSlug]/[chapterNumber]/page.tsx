'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { CheckoutModal } from '@/components/checkout-modal';
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  Bookmark,
  Sun,
  Moon,
  Columns,
  ListFilter,
  Check,
  Lock,
} from 'lucide-react';

export default function ComicReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { user, openLoginModal } = useAuth();

  const contentSlug = params.contentSlug as string;
  const chapterNumber = parseFloat(params.chapterNumber as string);

  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<'VERTICAL' | 'PAGED'>('VERTICAL');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'DARK' | 'LIGHT'>('DARK');
  const [bookmarked, setBookmarked] = useState(false);

  // Locked chapter state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement>(null);

  const fetchChapter = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${contentSlug}/chapters/${chapterNumber}`);
      const data = await res.json();

      if (!data.success) {
        if (data.error?.code === 'PAYMENT_REQUIRED') {
          setIsLocked(true);
          setCheckoutOpen(true);
        }
        return;
      }

      setChapterData(data.data.chapter);
      setPages(data.data.pages || []);
      setIsLocked(false);

      // Check saved progress
      if (user) {
        fetch(`/api/reading/resume/${data.data.chapter.contentId}`)
          .then((r) => r.json())
          .then((p) => {
            if (p.success && p.data?.reading?.pageNumber) {
              setCurrentPage(p.data.reading.pageNumber);
            }
          })
          .catch(() => {});
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapter();
  }, [contentSlug, chapterNumber, user]);

  // Sync reading progress to server
  const saveProgress = async (pageNum: number) => {
    if (!user || !chapterData) return;
    const percent = Math.min(100, Math.round((pageNum / Math.max(1, pages.length)) * 100));

    try {
      await fetch('/api/reading/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: chapterData.contentId,
          chapterId: chapterData.id,
          pageNumber: pageNum,
          percentCompleted: percent,
        }),
      });
    } catch {}
  };

  const handleNextPage = () => {
    if (currentPage < pages.length) {
      const next = currentPage + 1;
      setCurrentPage(next);
      saveProgress(next);
    } else if (chapterData?.navigation?.next) {
      router.push(`/read/comic/${contentSlug}/${chapterData.navigation.next.chapterNumber}`);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      saveProgress(prev);
    } else if (chapterData?.navigation?.prev) {
      router.push(`/read/comic/${contentSlug}/${chapterData.navigation.prev.chapterNumber}`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      readerContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      openLoginModal();
      return;
    }
    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: chapterData.contentId,
          chapterId: chapterData.id,
          pageNumber: currentPage,
          note: `Comic bookmark at page ${currentPage}`,
        }),
      });
      setBookmarked(true);
      setTimeout(() => setBookmarked(false), 2000);
    } catch {}
  };

  if (isLocked) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Premium Chapter Locked</h2>
        <p className="text-sm text-slate-400 max-w-md">
          This chapter requires an active subscription or individual purchase to read.
        </p>
        <button
          onClick={() => setCheckoutOpen(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
        >
          Unlock Chapter Now
        </button>

        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          itemType="CHAPTER"
          targetId={chapterData?.id || ''}
          title={`Chapter ${chapterNumber}`}
          priceCents={chapterData?.priceCents || 4900}
          onSuccess={fetchChapter}
        />
      </div>
    );
  }

  return (
    <div
      ref={readerContainerRef}
      className={`min-h-screen flex flex-col transition-colors ${
        theme === 'DARK' ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      {/* Sticky Reader Toolbar */}
      <header className="sticky top-0 z-40 h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/content/${contentSlug}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Exit Reader"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="truncate">
            <h1 className="text-xs font-bold text-white truncate">
              {chapterData?.contentTitle || 'Comic'}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              Chapter {chapterNumber}: {chapterData?.title}
            </p>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2">
          {/* Mode switch */}
          <button
            onClick={() => setMode(mode === 'VERTICAL' ? 'PAGED' : 'VERTICAL')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5"
            title="Switch Reading Mode"
          >
            <Columns className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{mode === 'VERTICAL' ? 'Webtoon' : 'Paged'}</span>
          </button>

          {/* Zoom controls */}
          <button
            onClick={() => setZoom(Math.max(60, zoom - 15))}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(160, zoom + 15))}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 transition"
            title="Bookmark Page"
          >
            {bookmarked ? <Check className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Comic Viewer Area */}
      <main className="flex-grow flex flex-col items-center justify-center py-6 px-2 sm:px-4">
        {loading ? (
          <div className="py-24 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading comic pages...</p>
          </div>
        ) : mode === 'VERTICAL' ? (
          /* Vertical Webtoon Scroll Mode */
          <div
            className="w-full max-w-2xl flex flex-col items-center transition-all duration-200"
            style={{ width: `${zoom}%` }}
          >
            {pages.map((p, idx) => (
              <div
                key={p.id}
                className="w-full relative shadow-2xl bg-black"
                onMouseEnter={() => {
                  setCurrentPage(idx + 1);
                  saveProgress(idx + 1);
                }}
              >
                <img
                  src={p.imageUrl}
                  alt={`Page ${p.pageNumber}`}
                  className="w-full h-auto block select-none"
                  loading={idx < 3 ? 'eager' : 'lazy'}
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-slate-400 font-mono">
                  {p.pageNumber} / {pages.length}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Paged Slideshow Mode */
          <div
            className="relative flex flex-col items-center max-w-2xl w-full"
            style={{ width: `${zoom}%` }}
          >
            {pages[currentPage - 1] && (
              <div className="w-full rounded-xl overflow-hidden shadow-2xl bg-black">
                <img
                  src={pages[currentPage - 1].imageUrl}
                  alt={`Page ${currentPage}`}
                  className="w-full h-auto object-contain select-none"
                />
              </div>
            )}

            {/* Paged Navigation Bar */}
            <div className="flex items-center justify-between w-full mt-4 px-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1 && !chapterData?.navigation?.prev}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Page
              </button>

              <span className="text-xs font-mono font-bold text-slate-400">
                Page {currentPage} of {pages.length}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === pages.length && !chapterData?.navigation?.next}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition flex items-center gap-1 disabled:opacity-40"
              >
                Next Page
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Chapter Transition Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 flex items-center justify-between text-xs">
        <div>
          {chapterData?.navigation?.prev && (
            <Link
              href={`/read/comic/${contentSlug}/${chapterData.navigation.prev.chapterNumber}`}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Ch {chapterData.navigation.prev.chapterNumber}: {chapterData.navigation.prev.title}
            </Link>
          )}
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          Reading Chapter {chapterNumber} • Page {currentPage}/{pages.length}
        </div>

        <div>
          {chapterData?.navigation?.next && (
            <Link
              href={`/read/comic/${contentSlug}/${chapterData.navigation.next.chapterNumber}`}
              className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition"
            >
              Ch {chapterData.navigation.next.chapterNumber}: {chapterData.navigation.next.title}
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
