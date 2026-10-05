'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { CheckoutModal } from '@/components/checkout-modal';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Bookmark,
  Check,
  Lock,
  Type,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export default function NovelReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { user, openLoginModal } = useAuth();

  const contentSlug = params.contentSlug as string;
  const chapterNumber = parseFloat(params.chapterNumber as string);

  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState<any>(null);
  const [textContent, setTextContent] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Typography settings
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [lineSpacing, setLineSpacing] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');
  const [readingWidth, setReadingWidth] = useState<'narrow' | 'medium' | 'wide'>('medium');
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>('dark');

  // Locked chapter state
  const [isLocked, setIsLocked] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
      setTextContent(data.data.textContent || '');
      setIsLocked(false);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapter();
  }, [contentSlug, chapterNumber, user]);

  // Auto-save reading progress on scroll
  useEffect(() => {
    if (!user || !chapterData) return;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const scrollPercentage = Math.min(100, Math.round((window.scrollY / scrollHeight) * 100));

      fetch('/api/reading/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: chapterData.contentId,
          chapterId: chapterData.id,
          scrollPosition: window.scrollY,
          percentCompleted: scrollPercentage,
        }),
      }).catch(() => {});
    };

    const timer = setInterval(handleScroll, 10000); // sync every 10 seconds
    return () => clearInterval(timer);
  }, [user, chapterData]);

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
          note: `Novel bookmark at Chapter ${chapterNumber}`,
        }),
      });
      setBookmarked(true);
      setTimeout(() => setBookmarked(false), 2000);
    } catch {}
  };

  const getThemeClass = () => {
    if (theme === 'light') return 'theme-light';
    if (theme === 'sepia') return 'theme-sepia';
    return 'theme-dark';
  };

  const getFontFamilyClass = () => {
    if (fontFamily === 'serif') return 'font-serif';
    if (fontFamily === 'mono') return 'font-mono';
    return 'font-sans';
  };

  const getFontSizeClass = () => {
    if (fontSize === 'sm') return 'text-sm';
    if (fontSize === 'lg') return 'text-lg';
    if (fontSize === 'xl') return 'text-xl sm:text-2xl';
    return 'text-base';
  };

  const getLineSpacingClass = () => {
    if (lineSpacing === 'normal') return 'leading-normal';
    if (lineSpacing === 'loose') return 'leading-loose';
    return 'leading-relaxed';
  };

  const getWidthClass = () => {
    if (readingWidth === 'narrow') return 'max-w-xl';
    if (readingWidth === 'wide') return 'max-w-3xl';
    return 'max-w-2xl';
  };

  if (isLocked) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Premium Chapter Locked</h2>
        <p className="text-sm text-slate-400 max-w-md">
          This novel chapter requires an active subscription or purchase to read.
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
    <div className={`min-h-screen flex flex-col transition-colors ${getThemeClass()}`}>
      {/* Reader Sticky Header */}
      <header className="sticky top-0 z-40 h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 text-slate-200">
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
              {chapterData?.contentTitle || 'Novel'}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              Chapter {chapterNumber}: {chapterData?.title}
            </p>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBookmark}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 transition"
            title="Bookmark"
          >
            {bookmarked ? <Check className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            title="Typography & Theme Settings"
          >
            <Type className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Aa</span>
          </button>
        </div>
      </header>

      {/* Typography Settings Dropdown Panel */}
      {settingsOpen && (
        <div className="sticky top-14 z-30 bg-slate-900 border-b border-slate-800 p-4 text-xs text-slate-200 shadow-2xl">
          <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Theme */}
            <div>
              <p className="font-semibold text-slate-400 mb-1.5">Theme</p>
              <div className="flex gap-1">
                {(['dark', 'sepia', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-2.5 py-1 rounded-lg capitalize font-medium ${
                      theme === t ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <p className="font-semibold text-slate-400 mb-1.5">Font</p>
              <div className="flex gap-1">
                {(['serif', 'sans', 'mono'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFontFamily(f)}
                    className={`px-2.5 py-1 rounded-lg capitalize font-medium ${
                      fontFamily === f ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <p className="font-semibold text-slate-400 mb-1.5">Size</p>
              <div className="flex gap-1">
                {(['sm', 'base', 'lg', 'xl'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s)}
                    className={`px-2 py-1 rounded-lg uppercase font-mono font-bold text-[11px] ${
                      fontSize === s ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Column Width */}
            <div>
              <p className="font-semibold text-slate-400 mb-1.5">Width</p>
              <div className="flex gap-1">
                {(['narrow', 'medium', 'wide'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setReadingWidth(w)}
                    className={`px-2 py-1 rounded-lg capitalize text-[11px] ${
                      readingWidth === w ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Novel Reading Body */}
      <main className="flex-grow flex flex-col items-center py-12 px-4 sm:px-6">
        {loading ? (
          <div className="py-24 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading novel text...</p>
          </div>
        ) : (
          <article className={`w-full ${getWidthClass()} space-y-8 select-text`}>
            <header className="border-b border-slate-800/40 pb-6 text-center space-y-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                Chapter {chapterNumber}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {chapterData?.title}
              </h2>
            </header>

            {/* Paragraphs */}
            <div
              className={`space-y-6 ${getFontFamilyClass()} ${getFontSizeClass()} ${getLineSpacingClass()}`}
            >
              {textContent.split('\n\n').map((para, idx) => (
                <p key={idx} className="indent-6 sm:indent-8 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>

            {/* Chapter Navigation Buttons */}
            <div className="pt-12 border-t border-slate-800/40 flex items-center justify-between gap-4">
              {chapterData?.navigation?.prev ? (
                <Link
                  href={`/read/novel/${contentSlug}/${chapterData.navigation.prev.chapterNumber}`}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Chapter
                </Link>
              ) : <div />}

              {chapterData?.navigation?.next ? (
                <Link
                  href={`/read/novel/${contentSlug}/${chapterData.navigation.next.chapterNumber}`}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  Next Chapter
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : <div />}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
