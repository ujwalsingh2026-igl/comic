'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { CheckoutModal } from '@/components/checkout-modal';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Clock,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Bookmark,
  Check,
  Lock,
  Headphones,
} from 'lucide-react';

export default function AudiobookPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { user, openLoginModal } = useAuth();

  const contentSlug = params.contentSlug as string;
  const chapterNumber = parseFloat(params.chapterNumber as string);

  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null); // minutes
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null); // seconds
  const [bookmarked, setBookmarked] = useState(false);

  // Locked state
  const [isLocked, setIsLocked] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const fetchAudioChapter = async () => {
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
      setAudioUrl(data.data.audio?.audioUrl || 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg');
      setDuration(data.data.audio?.durationSeconds || 1800);
      setIsLocked(false);

      // Check saved progress
      if (user) {
        fetch(`/api/reading/resume/${data.data.chapter.contentId}`)
          .then((r) => r.json())
          .then((p) => {
            if (p.success && p.data?.listening?.positionSeconds) {
              const savedSec = p.data.listening.positionSeconds;
              setCurrentTime(savedSec);
              if (audioRef.current) audioRef.current.currentTime = savedSec;
            }
          })
          .catch(() => {});
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioChapter();
  }, [contentSlug, chapterNumber, user]);

  // Sync listening progress periodically to backend
  useEffect(() => {
    if (!user || !chapterData || !isPlaying) return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        const cur = audioRef.current.currentTime;
        const dur = audioRef.current.duration || duration || 1;
        const percent = Math.min(100, Math.round((cur / dur) * 100));

        fetch('/api/reading/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'AUDIO',
            contentId: chapterData.contentId,
            chapterId: chapterData.id,
            positionSeconds: cur,
            durationSeconds: dur,
            percentCompleted: percent,
          }),
        }).catch(() => {});
      }
    }, 15000); // sync every 15s

    return () => clearInterval(interval);
  }, [user, chapterData, isPlaying, duration]);

  // Sleep timer interval
  useEffect(() => {
    if (sleepTimerRemaining === null || sleepTimerRemaining <= 0) return;

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev !== null && prev <= 1) {
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
          setSleepTimer(null);
          return null;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemaining]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const skipSeconds = (sec: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + sec));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const setTimerMinutes = (mins: number) => {
    setSleepTimer(mins);
    setSleepTimerRemaining(mins * 60);
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
          audioPositionSeconds: currentTime,
          note: `Audio bookmark at ${formatTime(currentTime)}`,
        }),
      });
      setBookmarked(true);
      setTimeout(() => setBookmarked(false), 2000);
    } catch {}
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLocked) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Audiobook Chapter Locked</h2>
        <p className="text-sm text-slate-400 max-w-md">
          This audiobook track requires an active subscription or chapter unlock to stream.
        </p>
        <button
          onClick={() => setCheckoutOpen(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
        >
          Unlock Track Now
        </button>

        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          itemType="CHAPTER"
          targetId={chapterData?.id || ''}
          title={`Chapter ${chapterNumber}`}
          priceCents={chapterData?.priceCents || 4900}
          onSuccess={fetchAudioChapter}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between py-6 px-4">
      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between pb-6">
        <Link
          href={`/content/${contentSlug}`}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
            Audiobook Player
          </span>
          <h2 className="text-sm font-bold text-slate-200 truncate max-w-xs">
            {chapterData?.contentTitle || 'Title'}
          </h2>
        </div>
        <button
          onClick={handleBookmark}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 transition"
          title="Bookmark position"
        >
          {bookmarked ? <Check className="w-5 h-5 text-emerald-400" /> : <Bookmark className="w-5 h-5" />}
        </button>
      </header>

      {/* Center Artwork & Track Info */}
      <div className="w-full max-w-md flex flex-col items-center space-y-6 my-auto">
        <div className="relative aspect-square w-64 sm:w-72 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-600/30 via-indigo-600/20 to-transparent" />
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <Headphones className="w-16 h-16 text-indigo-400/80 mb-4 animate-pulse" />
            <h3 className="font-extrabold text-base text-white line-clamp-2">
              {chapterData?.title || `Track ${chapterNumber}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Narrated with Studio Audio</p>
          </div>
        </div>

        {/* Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                if (audioRef.current.duration) setDuration(audioRef.current.duration);
              }
            }}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        {/* Progress Bar & Timers */}
        <div className="w-full space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls: Skip, Play/Pause */}
        <div className="flex items-center justify-center gap-6 w-full">
          <button
            onClick={() => skipSeconds(-30)}
            className="p-3 text-slate-400 hover:text-white transition flex flex-col items-center"
            title="Back 30s"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">30s</span>
          </button>

          <button
            onClick={() => skipSeconds(-10)}
            className="p-3 text-slate-400 hover:text-white transition flex flex-col items-center"
            title="Back 10s"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">10s</span>
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-500 hover:scale-105 transition-transform flex items-center justify-center text-white shadow-xl shadow-indigo-600/30"
          >
            {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-1" />}
          </button>

          <button
            onClick={() => skipSeconds(10)}
            className="p-3 text-slate-400 hover:text-white transition flex flex-col items-center"
            title="Forward 10s"
          >
            <RotateCw className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">10s</span>
          </button>

          <button
            onClick={() => skipSeconds(30)}
            className="p-3 text-slate-400 hover:text-white transition flex flex-col items-center"
            title="Forward 30s"
          >
            <RotateCw className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">30s</span>
          </button>
        </div>

        {/* Speed, Volume, Sleep Timer Controls */}
        <div className="flex items-center justify-between w-full pt-4 border-t border-slate-900 text-xs">
          {/* Speed Toggle */}
          <div className="flex items-center gap-1">
            {[0.75, 1, 1.25, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  speed === s
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-slate-400 hover:text-white">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-800 rounded accent-indigo-500"
            />
          </div>

          {/* Sleep Timer */}
          <div className="relative">
            <button
              onClick={() => setTimerMinutes(sleepTimer ? 0 : 30)}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition ${
                sleepTimerRemaining !== null
                  ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Sleep Timer"
            >
              <Clock className="w-4 h-4" />
              {sleepTimerRemaining !== null && (
                <span className="font-mono text-[10px]">{Math.ceil(sleepTimerRemaining / 60)}m</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Chapter navigation footer */}
      <footer className="w-full max-w-xl flex items-center justify-between pt-6 border-t border-slate-900 text-xs">
        {chapterData?.navigation?.prev ? (
          <Link
            href={`/listen/${contentSlug}/${chapterData.navigation.prev.chapterNumber}`}
            className="text-slate-400 hover:text-white flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Chapter
          </Link>
        ) : <div />}

        {chapterData?.navigation?.next ? (
          <Link
            href={`/listen/${contentSlug}/${chapterData.navigation.next.chapterNumber}`}
            className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
          >
            Next Chapter
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : <div />}
      </footer>
    </div>
  );
}
