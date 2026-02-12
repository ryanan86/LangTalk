'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const tutorInfo: Record<string, { name: string; description: string; gradient: string }> = {
  emma: { name: 'Emma', description: 'Your American bestie', gradient: 'from-rose-400 to-pink-500' },
  james: { name: 'James', description: 'British gentleman tutor', gradient: 'from-blue-400 to-indigo-500' },
  charlotte: { name: 'Charlotte', description: 'Elegant British tutor', gradient: 'from-purple-400 to-violet-500' },
  oliver: { name: 'Oliver', description: 'Cool British mentor', gradient: 'from-emerald-400 to-teal-500' },
  alina: { name: 'Alina', description: 'Young American friend', gradient: 'from-amber-400 to-orange-500' },
  henry: { name: 'Henry', description: 'Friendly American buddy', gradient: 'from-cyan-400 to-blue-500' },
};

function IncomingCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tutorId = searchParams.get('tutor') || 'emma';
  const tutor = tutorInfo[tutorId] || tutorInfo.emma;

  const [ringAnimation, setRingAnimation] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Auto-dismiss after 30 seconds if not answered
  useEffect(() => {
    if (accepted) return;
    const timer = setInterval(() => {
      setElapsed(prev => {
        if (prev >= 30) {
          router.push('/');
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [accepted, router]);

  // Ring animation pulse
  useEffect(() => {
    if (accepted) return;
    const interval = setInterval(() => {
      setRingAnimation(prev => !prev);
    }, 1500);
    return () => clearInterval(interval);
  }, [accepted]);

  const handleAccept = useCallback(() => {
    setAccepted(true);
    setTimeout(() => {
      router.push(`/talk?tutor=${tutorId}`);
    }, 600);
  }, [router, tutorId]);

  const handleDecline = useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${tutor.gradient} flex flex-col items-center justify-between py-16 px-6 relative overflow-hidden`}>
      {/* Background pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-64 h-64 rounded-full border-2 border-white/20 absolute transition-all duration-1000 ${
          ringAnimation ? 'scale-150 opacity-0' : 'scale-100 opacity-30'
        }`} />
        <div className={`w-48 h-48 rounded-full border-2 border-white/20 absolute transition-all duration-1000 delay-300 ${
          ringAnimation ? 'scale-150 opacity-0' : 'scale-100 opacity-30'
        }`} />
        <div className={`w-32 h-32 rounded-full border-2 border-white/20 absolute transition-all duration-1000 delay-500 ${
          ringAnimation ? 'scale-150 opacity-0' : 'scale-100 opacity-30'
        }`} />
      </div>

      {/* Top section - calling text */}
      <div className="text-center z-10">
        <p className="text-white/80 text-lg font-medium tracking-wide uppercase">
          Incoming Call
        </p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <span className={`w-1.5 h-1.5 rounded-full bg-white/60 ${!accepted ? 'animate-pulse' : ''}`} />
          <span className={`w-1.5 h-1.5 rounded-full bg-white/60 ${!accepted ? 'animate-pulse delay-100' : ''}`} style={{ animationDelay: '0.2s' }} />
          <span className={`w-1.5 h-1.5 rounded-full bg-white/60 ${!accepted ? 'animate-pulse delay-200' : ''}`} style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Center - tutor avatar */}
      <div className="flex flex-col items-center z-10">
        <div className={`w-36 h-36 rounded-full overflow-hidden border-4 border-white/40 shadow-2xl transition-transform duration-500 ${
          accepted ? 'scale-110' : ''
        }`}>
          <Image
            src={`/tutors/${tutorId}.png`}
            alt={tutor.name}
            width={144}
            height={144}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <h1 className="text-white text-3xl font-bold mt-6">{tutor.name}</h1>
        <p className="text-white/70 text-base mt-1">{tutor.description}</p>
        {accepted && (
          <p className="text-white/90 text-sm mt-3 font-medium">Connecting...</p>
        )}
      </div>

      {/* Bottom - action buttons */}
      {!accepted ? (
        <div className="flex items-center justify-center gap-16 z-10">
          {/* Decline */}
          <button
            onClick={handleDecline}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="text-white/80 text-xs font-medium">Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-bounce">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="text-white/80 text-xs font-medium">Accept</span>
          </button>
        </div>
      ) : (
        <div className="h-20 z-10" />
      )}

      {/* Auto-dismiss timer (subtle) */}
      {!accepted && elapsed > 0 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
          <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/50 rounded-full transition-all duration-1000"
              style={{ width: `${((30 - elapsed) / 30) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function IncomingCallPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-400 to-indigo-500 flex items-center justify-center">
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    }>
      <IncomingCallContent />
    </Suspense>
  );
}
