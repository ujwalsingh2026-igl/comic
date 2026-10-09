import React from 'react';
import Link from 'next/link';
import { ContentService } from '@/services/content.service';
import { ContentCard } from '@/components/content-card';
import {
  Sparkles,
  Flame,
  BookOpen,
  Headphones,
  Compass,
  ArrowRight,
  Star,
  Users,
} from 'lucide-react';

export const revalidate = 60; // ISR cache 60s

export default async function HomePage() {
  let feed: any = {
    featured: [],
    trendingComics: [],
    popularNovels: [],
    popularAudiobooks: [],
    newReleases: [],
    genres: [],
    popularAuthors: [],
  };

  try {
    const res = await ContentService.getHomeFeed();
    if (res) feed = res;
  } catch (err) {
    console.error('[HomePage] Error loading home feed:', err);
  }

  const heroItem: any = feed?.featured?.[0];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      {heroItem && (
        <section className="relative w-full h-[520px] md:h-[620px] overflow-hidden bg-slate-950 flex items-end">
          {/* Background image banner */}
          <div className="absolute inset-0">
            <img
              src={heroItem.bannerUrl || heroItem.coverUrl}
              alt={heroItem.title}
              className="w-full h-full object-cover object-top opacity-35 filter brightness-75 scale-105"
            />
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-xs font-bold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Featured Masterpiece • {heroItem.contentType}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                {heroItem.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed">
                {heroItem.description}
              </p>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
                <span className="text-slate-200">By {heroItem.authorName}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {heroItem.ratingAverage?.toFixed(2)} ({heroItem.ratingCount} reviews)
                </span>
                <span>•</span>
                <span className="text-indigo-400 font-bold uppercase">{heroItem.releaseStatus}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/content/${heroItem.slug}`}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Start Reading
                </Link>
                <Link
                  href={`/search`}
                  className="px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-sm transition"
                >
                  Explore More
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Trending Comics */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Trending Comics
              </h2>
            </div>
            <Link
              href="/search?type=COMIC"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {(feed?.trendingComics || []).map((comic: any) => (
              <ContentCard key={comic.id} {...comic} />
            ))}
          </div>
        </section>

        {/* Popular Novels */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Popular Novels & Web Fiction
              </h2>
            </div>
            <Link
              href="/search?type=NOVEL"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {(feed?.popularNovels || []).map((novel: any) => (
              <ContentCard key={novel.id} {...novel} />
            ))}
          </div>
        </section>

        {/* Audiobooks Showcase */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Immersive Audiobooks
              </h2>
            </div>
            <Link
              href="/search?type=AUDIOBOOK"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {(feed?.popularAudiobooks || []).map((audio: any) => (
              <ContentCard key={audio.id} {...audio} />
            ))}
          </div>
        </section>

        {/* Categories / Genres */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Browse by Genre
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(feed?.genres || []).map((g: any) => (
              <Link
                key={g.id}
                href={`/search?genre=${g.slug}`}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800/50 transition group flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition">
                    {g.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{g.description}</p>
                </div>
                <div className="text-[11px] font-semibold text-indigo-400 mt-3 flex items-center gap-1">
                  <span>{g.contentCount} Titles</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Authors */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Popular Authors & Creators
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(feed?.popularAuthors || []).map((author: any) => (
              <Link
                key={author.id}
                href={`/author/${author.slug}`}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/60 transition flex items-center gap-4 group"
              >
                <img
                  src={author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={author.name}
                  className="w-14 h-14 rounded-full object-cover border border-slate-700"
                />
                <div className="flex-grow min-w-0">
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition truncate">
                    {author.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{author.bio}</p>
                  <p className="text-[10px] text-indigo-400 font-semibold mt-1">
                    {author.contentCount} Published Works
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
