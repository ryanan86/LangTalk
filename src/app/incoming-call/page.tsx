'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Skeleton from '@/components/ui/Skeleton';

const tutorInfo: Record<string, { name: string; description: string; gradient: string; accentHex: string }> = {
  emma:      { name: 'Emma',      description: 'Your American bestie',    gradient: 'from-rose-500 via-pink-500 to-fuchsia-600',    accentHex: '#F43F5E' },
  james:     { name: 'James',     description: 'British gentleman tutor', gradient: 'from-blue-600 via-indigo-500 to-violet-600',    accentHex: '#6366F1' },
  charlotte: { name: 'Charlotte', description: 'Elegant British tutor',   gradient: 'from-violet-600 via-purple-500 to-fuchsia-500', accentHex: '#A855F7' },
  oliver:    { name: 'Oliver',    description: 'Cool British mentor',      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',    accentHex: '#10B981' },
  alina:     { name: 'Alina',     description: 'Young American friend',    gradient: 'from-amber-500 via-orange-500 to-rose-500',    accentHex: '#F59E0B' },
  henry:     { name: 'Henry',     description: 'Friendly American buddy',  gradient: 'from-cyan-500 via-sky-500 to-blue-500',        accentHex: '#0EA5E9' },
};

// ─── Phone SVG icon ──────────────────────────────────────────────────────────
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
        d="M16.5 8.25l-3.75 3.75M7.5 15.75l3.75-3.75m0 0l3.75-3.75M11.25 12l-3.75 3.75M3.375 3.375C2.25 4.5 2.25 6.75 2.25 11.25v1.5c0 4.5 0 6.75 1.125 7.875S6.75 21.75 11.25 21.75h1.5c4.5 0 6.75 0 7.875-1.125S21.75 17.25 21.75 12.75v-1.5c0-4.5 0-6.75-1.125-7.875S17.25 2.25 12.75 2.25h-1.5C6.75 2.25 4.5 2.25 3.375 3.375z" />
    </svg>
  );
}

// ─── Slide-to-answer component ────────────────────────────────────────────────
function SlideToAnswerButton({ onAccept, accentHex }: { onAccept: () => void; accentHex: string }) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderWidth = 280;
  const maxDrag = sliderWidth - 64;

  const handleTouchStart = () => setIsDragging(true);

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    let clientX: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = clientX - rect.left - 32;
      const boundedX = Math.max(0, Math.min(offsetX, maxDrag));
      setDragX(boundedX);
    }
  };

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > maxDrag * 0.85) {
      setDragX(maxDrag);
      onAccept();
    } else {
      setDragX(0);
    }
  }, [isDragging, dragX, maxDrag, onAccept]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleTouchEnd);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleTouchEnd]);

  const progress = dragX / maxDrag;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-16 rounded-full overflow-hidden select-none"
      style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
      onTouchMove={handleTouchMove}
      onMouseMove={handleTouchMove}
    >
      {/* Fill track */}
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
        style={{
          width: `calc(2rem + ${dragX}px)`,
          background: `linear-gradient(90deg, ${accentHex}40 0%, ${accentHex}20 100%)`,
        }}
      />

      {/* Hint text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-white/60 text-sm font-medium tracking-wider transition-opacity duration-150"
          style={{ opacity: 1 - progress * 1.5 }}
        >
          slide to answer
        </span>
      </div>

      {/* Knob */}
      <div
        className="absolute top-1 bottom-1 left-1 w-14 rounded-full flex items-center justify-center z-10 cursor-grab active:cursor-grabbing transition-shadow"
        style={{
          transform: `translateX(${dragX}px)`,
          background: 'white',
          boxShadow: `0 4px 20px rgba(0,0,0,0.25), 0 0 0 3px ${accentHex}30`,
          transition: isDragging ? 'box-shadow 0.1s' : 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.1s',
        }}
        onTouchStart={handleTouchStart}
        onMouseDown={handleTouchStart}
      >
        <span style={{ color: accentHex }}>
          <PhoneIcon className="w-6 h-6" />
        </span>
      </div>
    </div>
  );
}

// ─── Main call screen ─────────────────────────────────────────────────────────
function IncomingCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tutorId = searchParams.get('tutor') || 'emma';
  const tutor = tutorInfo[tutorId] || tutorInfo.emma;

  const [accepted, setAccepted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioUnlocked = useRef(false);

  // Play audio helper
  const playAudio = useCallback(() => {
    if (audioRef.current && !accepted) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => { audioUnlocked.current = true; })
          .catch(() => { /* Autoplay prevented; will retry on first touch */ });
      }
    }
  }, [accepted]);

  // Unlock audio on first touch
  useEffect(() => {
    const handleTouch = () => {
      if (!audioUnlocked.current && !accepted) playAudio();
    };
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('click', handleTouch, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('click', handleTouch);
    };
  }, [playAudio, accepted]);

  // Initial autoplay attempt
  useEffect(() => {
    const timer = setTimeout(() => playAudio(), 500);
    return () => clearTimeout(timer);
  }, [playAudio]);

  // Stop audio on accept
  useEffect(() => {
    if (accepted && audioRef.current) audioRef.current.pause();
  }, [accepted]);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (accepted) return;
    const timer = setInterval(() => {
      setElapsed(prev => {
        if (prev >= 30) { router.push('/'); return prev; }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [accepted, router]);

  const handleAccept = useCallback(() => {
    setAccepted(true);
    if (audioRef.current) audioRef.current.pause();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => router.push(`/talk?tutor=${tutorId}`), 600);
  }, [router, tutorId]);

  const handleDecline = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    router.push('/');
  }, [router]);

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden"
      style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))', paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}
    >
      <audio ref={audioRef} src="/audio/ringtone.mp3" loop preload="auto" />

      {/* Full-screen gradient backdrop */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-b ${tutor.gradient}`}
      />

      {/* Dark overlay for contrast */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/30" />

      {/* Ambient ring glow behind avatar — always-on, not toggled */}
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="absolute w-[360px] h-[360px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${tutor.accentHex} 0%, transparent 70%)` }}
        />
        {/* Concentric pulse rings */}
        {!accepted && (
          <>
            <div
              className="absolute w-64 h-64 rounded-full border-2 border-white/25 motion-safe:animate-pulse"
              style={{ animationDuration: '2.2s' }}
            />
            <div
              className="absolute w-48 h-48 rounded-full border-2 border-white/20 motion-safe:animate-pulse"
              style={{ animationDuration: '2.2s', animationDelay: '0.4s' }}
            />
            <div
              className="absolute w-32 h-32 rounded-full border border-white/15 motion-safe:animate-pulse"
              style={{ animationDuration: '2.2s', animationDelay: '0.8s' }}
            />
          </>
        )}
      </div>

      {/* Auto-dismiss progress bar */}
      {!accepted && elapsed > 0 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-20">
          <div
            className="h-full bg-white/40 transition-all duration-1000 ease-linear"
            style={{ width: `${((30 - elapsed) / 30) * 100}%` }}
          />
        </div>
      )}

      {/* ── Top: Incoming call label ───────────────────────────────────────── */}
      <div className="relative z-10 text-center">
        <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.18em] mb-2">
          Incoming Call
        </p>
        {/* Ringing dots */}
        {!accepted && (
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/50 motion-safe:animate-pulse"
                style={{ animationDelay: `${i * 0.22}s`, animationDuration: '1.4s' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Center: Tutor avatar ───────────────────────────────────────────── */}
      <div
        className={`relative z-10 flex flex-col items-center transition-all duration-700 ${
          accepted ? 'scale-105 translate-y-6' : 'motion-safe:animate-gentle-bounce'
        }`}
      >
        {/* Avatar ring */}
        <div
          className="w-40 h-40 rounded-full overflow-hidden relative"
          style={{
            boxShadow: `0 0 0 4px rgba(255,255,255,0.25), 0 0 0 8px ${tutor.accentHex}30, 0 20px 60px rgba(0,0,0,0.4)`,
          }}
        >
          <Image
            src={`/tutors/${tutorId}.png`}
            alt={tutor.name}
            width={160}
            height={160}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        {/* Name + description */}
        <h1 className="text-white text-3xl font-bold mt-6 tracking-tight">{tutor.name}</h1>
        <p className="text-white/65 text-base mt-1.5 font-medium">{tutor.description}</p>

        {accepted && (
          <p className="text-white/80 text-sm mt-3 font-medium motion-safe:animate-pulse">
            Connecting...
          </p>
        )}
      </div>

      {/* ── Bottom: Controls ───────────────────────────────────────────────── */}
      {!accepted ? (
        <div className="relative z-10 w-full max-w-xs flex flex-col gap-6 px-4">
          {/* Decline / Remind row */}
          <div className="flex justify-between items-center px-6">
            {/* Decline */}
            <button
              onClick={handleDecline}
              className="pressable flex flex-col items-center gap-2"
              aria-label="Decline call"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(239,68,68,0.35)' }}
              >
                <PhoneOffIcon className="w-7 h-7 text-white" />
              </div>
              <span className="text-white/60 text-xs font-medium">Decline</span>
            </button>

            {/* Remind later */}
            <button
              onClick={handleDecline}
              className="pressable flex flex-col items-center gap-2"
              aria-label="Remind me later"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-white/60 text-xs font-medium">Remind</span>
            </button>
          </div>

          {/* Slide to answer */}
          <SlideToAnswerButton onAccept={handleAccept} accentHex={tutor.accentHex} />
        </div>
      ) : (
        /* Accepted state spacer */
        <div className="relative z-10 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center motion-safe:animate-pulse">
          <PhoneIcon className="w-7 h-7 text-white" />
        </div>
      )}
    </div>
  );
}

export default function IncomingCallPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-violet-700 flex flex-col items-center justify-center gap-8">
        <Skeleton shape="circle" width={160} height={160} />
        <div className="space-y-2 text-center">
          <Skeleton shape="line" width={120} height={20} className="mx-auto" />
          <Skeleton shape="line" width={160} height={14} className="mx-auto" />
        </div>
      </div>
    }>
      <IncomingCallContent />
    </Suspense>
  );
}
