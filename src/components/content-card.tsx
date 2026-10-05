import React from 'react';
import Link from 'next/link';
import { Star, Headphones, BookOpen, Scroll, Lock } from 'lucide-react';

export interface ContentCardProps {
  id: string;
  title: string;
  slug: string;
  contentType: 'COMIC' | 'NOVEL' | 'SHORT_STORY' | 'AUDIOBOOK';
  coverUrl: string;
  authorName?: string;
  ratingAverage?: number;
  isPremium?: boolean;
  priceCents?: number;
  narrator?: string;
}

export function ContentCard({
  title,
  slug,
  contentType,
  coverUrl,
  authorName,
  ratingAverage,
  isPremium,
  priceCents,
  narrator,
}: ContentCardProps) {
  const getIcon = () => {
    switch (contentType) {
      case 'AUDIOBOOK':
        return <Headphones className="w-3 h-3 text-pink-400" />;
      case 'NOVEL':
        return <BookOpen className="w-3 h-3 text-emerald-400" />;
      case 'SHORT_STORY':
        return <Scroll className="w-3 h-3 text-amber-400" />;
      default:
        return <BookOpen className="w-3 h-3 text-indigo-400" />;
    }
  };

  return (
    <Link
      href={`/content/${slug}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

        {/* Content Type Badge */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white flex items-center gap-1 shadow">
          {getIcon()}
          <span>{contentType.replace('_', ' ')}</span>
        </div>

        {/* Premium / Free Badge */}
        <div className="absolute top-2.5 right-2.5">
          {isPremium ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-bold flex items-center gap-1 shadow">
              <Lock className="w-2.5 h-2.5" />
              {priceCents ? `₹${priceCents / 100}` : 'PREMIUM'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/80 text-white text-[10px] font-bold shadow">
              FREE
            </span>
          )}
        </div>

        {/* Rating overlay */}
        {ratingAverage !== undefined && ratingAverage > 0 && (
          <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{ratingAverage.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-3.5 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
            {contentType === 'AUDIOBOOK' && narrator
              ? `Narrated by ${narrator}`
              : authorName || 'Unknown Author'}
          </p>
        </div>
      </div>
    </Link>
  );
}
