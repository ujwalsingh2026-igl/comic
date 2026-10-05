import React from 'react';
import Link from 'next/link';
import { BookOpen, Shield, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950/90 text-slate-400 text-xs py-12 px-4 sm:px-6 lg:px-8 mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              NOVELA<span className="text-indigo-400">.</span>
            </span>
          </div>
          <p className="text-slate-500 leading-relaxed text-[11px]">
            The next-generation digital storytelling platform for reading comics, novels, stories, and streaming premium audiobooks.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">Discover</h4>
          <ul className="space-y-2 text-[11px]">
            <li><Link href="/search?type=COMIC" className="hover:text-white transition">Trending Comics</Link></li>
            <li><Link href="/search?type=NOVEL" className="hover:text-white transition">Popular Novels</Link></li>
            <li><Link href="/search?type=AUDIOBOOK" className="hover:text-white transition">Exclusive Audiobooks</Link></li>
            <li><Link href="/search" className="hover:text-white transition">Browse All Genres</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">Platform & Pricing</h4>
          <ul className="space-y-2 text-[11px]">
            <li><Link href="/pricing" className="hover:text-white transition">Subscription Plans</Link></li>
            <li><Link href="/library" className="hover:text-white transition">My Library & Shelves</Link></li>
            <li><Link href="/history" className="hover:text-white transition">Reading History</Link></li>
            <li><Link href="/profile" className="hover:text-white transition">Privacy & Data Control</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">Trust & Security</h4>
          <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
            Built with strict data privacy, verified server-side payment authorizations, and end-to-end audit logging.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>PCI & GDPR Architecture Compliant</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <p>© 2026 NOVELA Platform. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="hover:text-slate-400">Privacy Center</Link>
          <Link href="/pricing" className="hover:text-slate-400">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
