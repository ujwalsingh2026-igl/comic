'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Star, ThumbsUp, MessageSquare, AlertTriangle } from 'lucide-react';

interface ReviewSectionProps {
  contentId: string;
}

export function ReviewSection({ contentId }: ReviewSectionProps) {
  const { user, openLoginModal } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews/${contentId}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [contentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openLoginModal();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          rating,
          title,
          body,
          isSpoiler,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to submit review');

      setShowForm(false);
      setTitle('');
      setBody('');
      fetchReviews();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (reviewId: string) => {
    if (!user) {
      openLoginModal();
      return;
    }

    try {
      await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful: true }),
      });
      fetchReviews();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          Community Reviews ({reviews.length})
        </h3>
        <button
          onClick={() => {
            if (!user) openLoginModal();
            else setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </button>
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-slate-100">Leave Your Rating & Thoughts</h4>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Your Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-5 h-5 ${
                      s <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-amber-400 ml-2">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Review Headline (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unbelievable cliffhanger and gorgeous art"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Your Review</label>
            <textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share what you loved about the characters, pacing, or storytelling..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>Contains spoilers</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Post Review'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-slate-500 py-4">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400">No reviews yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                    {rev.userName?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">{rev.userName}</span>
                    <div className="flex items-center gap-1 text-[11px] text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500">
                  {new Date(rev.createdAt).toLocaleDateString()}
                </span>
              </div>

              {rev.title && (
                <h5 className="font-bold text-xs text-slate-100">{rev.title}</h5>
              )}

              {rev.isSpoiler ? (
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Review contains spoilers: {rev.body}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed">{rev.body}</p>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <button
                  onClick={() => handleVote(rev.id)}
                  className="flex items-center gap-1 text-slate-400 hover:text-indigo-400 transition"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Helpful ({rev.helpfulCount || 0})</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
