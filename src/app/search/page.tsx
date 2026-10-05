import React from 'react';
import { ContentService } from '@/services/content.service';
import { ContentCard } from '@/components/content-card';
import { Search, Filter, SlidersHorizontal, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface SearchPageProps {
  searchParams: {
    q?: string;
    type?: 'COMIC' | 'NOVEL' | 'SHORT_STORY' | 'AUDIOBOOK';
    genre?: string;
    premium?: string;
    minRating?: string;
    status?: 'ONGOING' | 'COMPLETED';
    sort?: 'relevance' | 'newest' | 'popular' | 'rating';
    page?: string;
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = searchParams.q || '';
  const type = searchParams.type;
  const genre = searchParams.genre;
  const isPremium = searchParams.premium !== undefined ? searchParams.premium === 'true' : undefined;
  const minRating = searchParams.minRating ? parseFloat(searchParams.minRating) : undefined;
  const status = searchParams.status;
  const sort = searchParams.sort || 'relevance';
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const result = await ContentService.search({
    query: q,
    contentType: type,
    genreSlug: genre,
    isPremium,
    minRating,
    releaseStatus: status,
    sortBy: sort,
    page,
    limit: 16,
  });

  const genres = [
    { name: 'All Genres', slug: '' },
    { name: 'Action', slug: 'action' },
    { name: 'Fantasy', slug: 'fantasy' },
    { name: 'Sci-Fi', slug: 'sci-fi' },
    { name: 'Romance', slug: 'romance' },
    { name: 'Mystery', slug: 'mystery' },
    { name: 'Thriller', slug: 'thriller' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header & Input */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Explore Content Library
        </h1>

        <form action="/search" method="GET" className="flex gap-2 max-w-2xl">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by title, author, or keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500"
            />
            {type && <input type="hidden" name="type" value={type} />}
            {genre && <input type="hidden" name="genre" value={genre} />}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Content Type Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-800">
        {[
          { label: 'All Formats', value: '' },
          { label: 'Comics', value: 'COMIC' },
          { label: 'Novels', value: 'NOVEL' },
          { label: 'Short Stories', value: 'SHORT_STORY' },
          { label: 'Audiobooks', value: 'AUDIOBOOK' },
        ].map((item) => {
          const isActive = (!type && item.value === '') || type === item.value;
          const queryParams = new URLSearchParams();
          if (q) queryParams.set('q', q);
          if (item.value) queryParams.set('type', item.value);
          if (genre) queryParams.set('genre', genre);
          if (sort) queryParams.set('sort', sort);

          return (
            <Link
              key={item.label}
              href={`/search?${queryParams.toString()}`}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Filter Row: Genres & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium">Genre:</span>
          {genres.map((g) => {
            const isGActive = (!genre && g.slug === '') || genre === g.slug;
            const queryParams = new URLSearchParams();
            if (q) queryParams.set('q', q);
            if (type) queryParams.set('type', type);
            if (g.slug) queryParams.set('genre', g.slug);
            if (sort) queryParams.set('sort', sort);

            return (
              <Link
                key={g.name}
                href={`/search?${queryParams.toString()}`}
                className={`px-2.5 py-1 rounded-lg text-xs transition ${
                  isGActive
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {g.name}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Sort:</span>
          <select
            defaultValue={sort}
            onChange={undefined}
            className="bg-slate-900 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-xs focus:outline-none"
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-slate-400">
        Showing {result.items.length} of {result.pagination.totalCount} titles
      </div>

      {/* Content Grid */}
      {result.items.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-slate-900/30 border border-slate-800 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-200">No matching titles found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, selecting different genres, or clearing active filters.
          </p>
          <Link
            href="/search"
            className="inline-block mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl transition"
          >
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
          {result.items.map((item: any) => (
            <ContentCard key={item.id} {...item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {Array.from({ length: result.pagination.totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const queryParams = new URLSearchParams();
            if (q) queryParams.set('q', q);
            if (type) queryParams.set('type', type);
            if (genre) queryParams.set('genre', genre);
            if (sort) queryParams.set('sort', sort);
            queryParams.set('page', pageNum.toString());

            return (
              <Link
                key={pageNum}
                href={`/search?${queryParams.toString()}`}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                  page === pageNum
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
