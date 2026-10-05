import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ContentService } from '@/services/content.service';
import { ContentActions } from '@/components/content-actions';
import { ReviewSection } from '@/components/review-section';
import {
  Star,
  BookOpen,
  Headphones,
  Lock,
  Play,
  Calendar,
  Eye,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface ContentDetailPageProps {
  params: { slug: string };
}

export default async function ContentDetailPage({ params }: ContentDetailPageProps) {
  let data: any = null;
  try {
    data = await ContentService.getContentBySlug(params.slug);
  } catch {
    notFound();
  }

  const { content, genres, chapters, userState } = data;

  const firstChapter = chapters[0];
  const readerPath = (chNum: number) => {
    if (content.contentType === 'AUDIOBOOK') return `/listen/${content.slug}/${chNum}`;
    if (content.contentType === 'NOVEL' || content.contentType === 'SHORT_STORY') {
      return `/read/novel/${content.slug}/${chNum}`;
    }
    return `/read/comic/${content.slug}/${chNum}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Cover Column */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
            <img
              src={content.coverUrl}
              alt={content.title}
              className="w-full h-full object-cover"
            />
            {content.isPremium && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-amber-500 text-black text-xs font-black shadow flex items-center gap-1">
                <Lock className="w-3 h-3" />
                PREMIUM
              </div>
            )}
          </div>
        </div>

        {/* Metadata & Actions Column */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                {content.contentType.replace('_', ' ')}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold uppercase">
                {content.releaseStatus}
              </span>
              {genres.map((g: any) => (
                <span
                  key={g.id}
                  className="px-2.5 py-0.5 rounded-md bg-slate-900 text-slate-400 text-xs"
                >
                  {g.name}
                </span>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {content.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <Link
                href={`/author/${content.authorSlug}`}
                className="text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                By {content.authorName}
              </Link>
              <span>•</span>
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{content.ratingAverage?.toFixed(2)}</span>
                <span className="text-slate-500">({content.ratingCount} reviews)</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 text-slate-400">
                <Eye className="w-3.5 h-3.5" />
                <span>{content.viewCount.toLocaleString()} views</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            {content.description}
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {firstChapter && (
              <Link
                href={readerPath(firstChapter.chapterNumber)}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center gap-2"
              >
                {content.contentType === 'AUDIOBOOK' ? (
                  <Play className="w-4 h-4 fill-white" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                {content.contentType === 'AUDIOBOOK' ? 'Listen to Sample' : 'Start Reading (Ch 1)'}
              </Link>
            )}

            <ContentActions
              contentId={content.id}
              firstChapterId={firstChapter?.id}
              initialInLibrary={userState.isInLibrary}
              initialShelf={userState.libraryShelf}
            />
          </div>
        </div>
      </div>

      {/* Chapters & Contents Table */}
      <section className="space-y-4 pt-6 border-t border-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Chapters & Episodes ({chapters.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 divide-y divide-slate-800/80 rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
          {chapters.map((ch: any) => {
            const isLocked = ch.isPremium && !userState.hasAccess;

            return (
              <Link
                key={ch.id}
                href={readerPath(ch.chapterNumber)}
                className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition">
                    {ch.chapterNumber}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200 group-hover:text-indigo-300 transition">
                      {ch.title}
                    </h4>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {ch.publishedAt ? new Date(ch.publishedAt).toLocaleDateString() : 'Available now'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {ch.isPremium ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {ch.priceCents ? `₹${ch.priceCents / 100}` : 'PREMIUM'}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-400">FREE</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Community Reviews Section */}
      <section className="pt-6 border-t border-slate-900">
        <ReviewSection contentId={content.id} />
      </section>
    </div>
  );
}
