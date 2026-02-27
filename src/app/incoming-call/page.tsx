'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
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
  const [shake, setShake] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioUnlocked = useRef(false);

  // Play audio helper
  const playAudio = useCallback(() => {
    if (audioRef.current && !accepted) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audioUnlocked.current = true;
          })
          .catch(() => {
            // Autoplay prevented; will retry on first touch
          });
      }
    }
  }, [accepted]);

  // Unlock audio on first touch if needed
  useEffect(() => {
    const handleTouch = () => {
      if (!audioUnlocked.current && !accepted) {
        playAudio();
      }
    };

    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('click', handleTouch, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('click', handleTouch);
    };
  }, [playAudio, accepted]);

  // Initial Autoplay attempt
  useEffect(() => {
    // Small delay to ensure DOM is ready and consistent
    const timer = setTimeout(() => {
      playAudio();
    }, 500);
    return () => clearTimeout(timer);
  }, [playAudio]);

  // Stop audio on accept/unmount
  useEffect(() => {
    if (accepted && audioRef.current) {
      audioRef.current.pause();
    }
  }, [accepted]);

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

  // Shake animation trigger (Visual Vibration)
  useEffect(() => {
    if (accepted) return;
    const interval = setInterval(() => {
      setShake(true);
      setTimeout(() => setShake(false), 800); // Reset after animation duration
    }, 2500); // Shake every 2.5s
    return () => clearInterval(interval);
  }, [accepted]);

  const handleAccept = useCallback(() => {
    setAccepted(true);
    if (audioRef.current) audioRef.current.pause();
    
    // Haptic feedback if available (Android)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
       navigator.vibrate(50);
    }

    setTimeout(() => {
      router.push(`/talk?tutor=${tutorId}`);
    }, 600);
  }, [router, tutorId]);

  const handleDecline = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    router.push('/');
  }, [router]);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${tutor.gradient} flex flex-col items-center justify-between py-16 px-6 relative overflow-hidden transition-all duration-300`}>
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src="/audio/ringtone.mp3" 
        loop 
        preload="auto" 
      />

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
        <p className="text-slate-900/80 dark:text-white/80 text-lg font-medium tracking-wide uppercase">
          Incoming Call
        </p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <span className={`w-1.5 h-1.5 rounded-full bg-white/60 ${!accepted ? 'animate-pulse' : ''}`} />
          <span className={`w-1.5 h-1.5 rounded-full bg-white/60 ${!accepted ? 'animate-pulse delay-100' : ''}`} style={{ animationDelay: '0.2s' }} />
          <span className={`w-1.5 h-1.5 rounded-full bg-white/60 ${!accepted ? 'animate-pulse delay-200' : ''}`} style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Center - tutor avatar with Shake Effect */}
      <div className={`flex flex-col items-center z-10 transition-transform duration-500 ${accepted ? 'scale-110 translate-y-10' : ''} ${shake && !accepted ? 'animate-shake' : ''}`}>
        <div className={`w-40 h-40 rounded-full overflow-hidden border-4 border-white/40 shadow-2xl relative`}>
           <Image
            src={`/tutors/${tutorId}.png`}
            alt={tutor.name}
            width={160}
            height={160}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <h1 className="text-slate-900 dark:text-white text-3xl font-bold mt-8 shadow-sm">{tutor.name}</h1>
        <p className="text-slate-700 dark:text-white/80 text-lg mt-2 font-medium">{tutor.description}</p>
        {accepted && (
          <p className="text-slate-700 dark:text-white/90 text-sm mt-3 font-medium animate-pulse">Connecting audio...</p>
        )}
      </div>

      {/* Bottom - Slide to Answer */}
      {!accepted ? (
        <div className="w-full max-w-xs z-10 pb-8">
           <div className="mb-8 flex justify-between items-center px-4">
              <button 
                onClick={handleDecline}
                className="flex flex-col items-center gap-2 group"
              >
                 <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-transform active:scale-95">
                    <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </div>
                 <span className="text-slate-600 dark:text-white/70 text-xs font-medium">Message</span>
              </button>

              <button 
                onClick={() => {
                  // Instant reminder logic or similar
                  handleDecline();
                }}
                className="flex flex-col items-center gap-2 group"
              >
                 <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-transform active:scale-95">
                    <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                 </div>
                 <span className="text-slate-600 dark:text-white/70 text-xs font-medium">Remind</span>
              </button>
           </div>

           <SlideToAnswerButton onAccept={handleAccept} />
        </div>
      ) : (
        <div className="h-20 z-10" />
      )}

      {/* Auto-dismiss timer (subtle) */}
      {!accepted && elapsed > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/10">
            <div 
               className="h-full bg-slate-900/20 dark:bg-white/30 transition-all duration-1000 ease-linear"
               style={{ width: `${((30 - elapsed) / 30) * 100}%` }}
            />
        </div>
      )}
    </div>
  );
}

function SlideToAnswerButton({ onAccept }: { onAccept: () => void }) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderWidth = 280; // Approximate width of container
  const maxDrag = sliderWidth - 64; // Width minus button size

  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    // Prevent scrolling while sliding
    // e.preventDefault(); // React synthetic events might not need this or might warn
    
    let clientX;
    if ('touches' in e) {
       clientX = e.touches[0].clientX;
    } else {
       clientX = (e as React.MouseEvent).clientX;
    }

    if (containerRef.current) {
       const rect = containerRef.current.getBoundingClientRect();
       const offsetX = clientX - rect.left - 32; // Center offset
       const boundedX = Math.max(0, Math.min(offsetX, maxDrag));
       setDragX(boundedX);
    }
  };

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragX > maxDrag * 0.85) {
       // Snap to end and accept
       setDragX(maxDrag);
       onAccept();
    } else {
       // Snap back
       setDragX(0);
    }
  }, [isDragging, dragX, maxDrag, onAccept]);

  // Add global listeners for mouse up to handle dragging outside
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

  return (
    <div
      className="relative w-full h-16 rounded-full bg-black/20 backdrop-blur-md border border-white/20 overflow-hidden select-none"
      ref={containerRef}
      onTouchMove={handleTouchMove}
      onMouseMove={handleTouchMove}
    >
       {/* Shimmer Text */}
       <div className="absolute inset-0 flex items-center justify-center z-0">
          <span className="text-slate-700/60 dark:text-white/50 text-base font-medium animate-pulse tracking-wider">
             slide to answer
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
       </div>

       {/* Slider Knob */}
       <div 
          className="absolute top-1 bottom-1 left-1 w-14 rounded-full bg-white shadow-lg flex items-center justify-center z-10 cursor-grab active:cursor-grabbing transition-transform duration-75 ease-out"
          style={{ transform: `translateX(${dragX}px)` }}
          onTouchStart={handleTouchStart}
          onMouseDown={handleTouchStart}
       >
          <svg className={`w-6 h-6 text-green-600 ${dragX > 10 ? 'opacity-100' : 'opacity-60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
       </div>
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