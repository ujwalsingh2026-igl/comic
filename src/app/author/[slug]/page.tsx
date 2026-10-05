'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ContentCard } from '@/components/content-card';
import { UserCheck, UserPlus, BookOpen, Star, Sparkles } from 'lucide-react';

export default function AuthorDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, openLoginModal } = useAuth();

  const [author, setAuthor] = useState<any>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/authors/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setAuthor(data.data.author);
          setWorks(data.data.works || []);
          setIsFollowing(data.data.isFollowing || false);
          setFollowerCount(data.data.author.followerCount || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, user]);

  const handleToggleFollow = async () => {
    if (!user) {
      openLoginModal();
      return;
    }

    try {
      const res = await fetch(`/api/authors/${author.id}/follow`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.data.isFollowing);
        setFollowerCount((prev) => (data.data.isFollowing ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading creator profile...</p>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-xl font-bold text-white">Author Not Found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Creator Profile Header */}
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
        <img
          src={author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
          alt={author.name}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-indigo-500/50 shadow-xl"
        />

        <div className="space-y-3 flex-grow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{author.name}</h1>
                {author.isVerified && (
                  <span className="p-1 rounded-full bg-indigo-500/20 text-indigo-400" title="Verified Creator">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-400 font-semibold mt-0.5">Official Creator</p>
            </div>

            <button
              onClick={handleToggleFollow}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                isFollowing
                  ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Follow Author
                </>
              )}
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {author.bio || 'Author creating stories on Novela.'}
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-6 pt-1 text-xs text-slate-400 font-medium">
            <div>
              <span className="font-bold text-white text-sm">{followerCount.toLocaleString()}</span> Followers
            </div>
            <div>
              <span className="font-bold text-white text-sm">{works.length}</span> Works Published
            </div>
          </div>
        </div>
      </div>

      {/* Published Works Catalog */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          Published Works ({works.length})
        </h2>

        {works.length === 0 ? (
          <p className="text-xs text-slate-500">No works published yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {works.map((work) => (
              <ContentCard key={work.id} {...work} authorName={author.name} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
