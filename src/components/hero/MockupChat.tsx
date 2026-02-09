'use client';

import { useState, useEffect, useCallback } from 'react';

function FlagSvg({ country }: { country: 'US' | 'UK' }) {
  if (country === 'US') {
    return (
      <svg viewBox="0 0 24 16" className="w-4 h-3 rounded-sm overflow-hidden">
        <rect width="24" height="16" fill="#B22234" />
        <rect y="1.23" width="24" height="1.23" fill="white" />
        <rect y="3.69" width="24" height="1.23" fill="white" />
        <rect y="6.15" width="24" height="1.23" fill="white" />
        <rect y="8.62" width="24" height="1.23" fill="white" />
        <rect y="11.08" width="24" height="1.23" fill="white" />
        <rect y="13.54" width="24" height="1.23" fill="white" />
        <rect width="9.6" height="8.62" fill="#3C3B6E" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 16" className="w-4 h-3 rounded-sm overflow-hidden">
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0L24 16M24 0L0 16" stroke="white" strokeWidth="2.4" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.2" />
      <path d="M12 0V16M0 8H24" stroke="white" strokeWidth="4" />
      <path d="M12 0V16M0 8H24" stroke="#C8102E" strokeWidth="2.4" />
    </svg>
  );
}

const TUTORS = [
  {
    name: 'Emma',
    nationality: 'American',
    gradient: 'from-rose-400 to-pink-500',
    ringColor: 'ring-rose-400',
    imagePath: '/tutors/emma.png',
    flagCountry: 'US' as const,
  },
  {
    name: 'James',
    nationality: 'American',
    gradient: 'from-blue-400 to-indigo-500',
    ringColor: 'ring-blue-400',
    imagePath: '/tutors/james.png',
    flagCountry: 'US' as const,
  },
  {
    name: 'Charlotte',
    nationality: 'British',
    gradient: 'from-violet-400 to-purple-500',
    ringColor: 'ring-violet-400',
    imagePath: '/tutors/charlotte.png',
    flagCountry: 'UK' as const,
  },
];

type MockStatus = 'idle' | 'speaking' | 'listening' | 'thinking';

/**
 * 실제 TapTalk 대화 화면을 재현하는 목업
 * - 큰 튜터 아바타 (중앙)
 * - 상태 표시 (speaking / listening / thinking)
 * - 음성 파형 애니메이션
 * - 하단 마이크 버튼
 */
export default function MockupChat() {
  const [tutorIndex, setTutorIndex] = useState(0);
  const [status, setStatus] = useState<MockStatus>('idle');
  const [transitioning, setTransitioning] = useState(false);
  const [timer, setTimer] = useState('0:42');

  const tutor = TUTORS[tutorIndex];

  const playSequence = useCallback(() => {
    // AI speaks
    const t1 = setTimeout(() => setStatus('speaking'), 500);
    // AI done, idle
    const t2 = setTimeout(() => setStatus('idle'), 3000);
    // User speaks (listening)
    const t3 = setTimeout(() => setStatus('listening'), 4000);
    // Processing user speech
    const t4 = setTimeout(() => setStatus('thinking'), 6000);
    // AI responds
    const t5 = setTimeout(() => setStatus('speaking'), 7500);
    // Done, idle
    const t6 = setTimeout(() => setStatus('idle'), 10000);
    // Transition to next tutor
    const t7 = setTimeout(() => setTransitioning(true), 11500);
    const t8 = setTimeout(() => {
      setTutorIndex((prev) => (prev + 1) % TUTORS.length);
      setTransitioning(false);
      setStatus('idle');
    }, 12200);

    return [t1, t2, t3, t4, t5, t6, t7, t8];
  }, []);

  useEffect(() => {
    const timers = playSequence();
    const loop = setInterval(() => {
      timers.push(...playSequence());
    }, 12500);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [tutorIndex, playSequence]);

  // Fake timer count
  useEffect(() => {
    let seconds = 42;
    const interval = setInterval(() => {
      seconds++;
      if (seconds >= 60) seconds = 42;
      setTimer(`0:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening';
  const isThinking = status === 'thinking';

  return (
    <div className={`flex flex-col h-full transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs text-white/50">Back</span>
        </div>
        <span className="text-xs text-white/40 font-medium">TapTalk</span>
        <div className="w-8" />
      </div>

      {/* Main content - Tutor avatar centered */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-4">
        {/* Ambient glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[250px] h-[250px] rounded-full opacity-25 transition-all duration-500"
          style={{
            background: `radial-gradient(circle, ${
              isListening ? 'rgba(239,68,68,0.5)' :
              isSpeaking ? 'rgba(124,58,237,0.5)' :
              isThinking ? 'rgba(245,158,11,0.4)' :
              'rgba(124,58,237,0.2)'
            } 0%, transparent 70%)`,
          }}
        />

        {/* Tutor avatar */}
        <div className="relative mb-3">
          {/* Animated ring for active states */}
          {status !== 'idle' && (
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${tutor.gradient} opacity-25 blur-lg`}
              style={{ transform: 'scale(1.25)' }}
            />
          )}
          {isSpeaking && (
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${tutor.gradient} opacity-20 animate-ping`}
              style={{ transform: 'scale(1.15)' }}
            />
          )}

          <div
            className={`relative w-32 h-32 rounded-full overflow-hidden ring-3 transition-all duration-500 ${
              isSpeaking ? `${tutor.ringColor} shadow-lg` :
              isListening ? 'ring-green-400 shadow-green-500/30' :
              isThinking ? 'ring-amber-400 shadow-amber-500/30' :
              'ring-white/20'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tutor.imagePath}
              alt={tutor.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add(`bg-gradient-to-br`, ...tutor.gradient.split(' '));
              }}
            />
            <div className={`absolute inset-0 ${tutor.gradient.replace('from-', 'bg-gradient-to-br from-').split(' ').join(' ')} flex items-center justify-center`} style={{ zIndex: -1 }}>
              <span className="text-2xl font-bold text-white">{tutor.name[0]}</span>
            </div>
          </div>

          {/* Flag */}
          <div className="absolute -bottom-0.5 -right-0.5 bg-[#0a0a0a] rounded-sm p-0.5">
            <FlagSvg country={tutor.flagCountry} />
          </div>
        </div>

        {/* Tutor name */}
        <h3 className="text-sm font-bold text-white mb-0.5">{tutor.name}</h3>
        <p className="text-[10px] text-white/40 mb-3">{tutor.nationality} Tutor</p>

        {/* Status indicator */}
        <div className="h-12 flex items-center justify-center">
          {isSpeaking && (
            <div className="flex flex-col items-center">
              <div className="flex items-end justify-center gap-[3px] h-6 mb-1.5">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-[3px] rounded-full bg-gradient-to-t ${tutor.gradient}`}
                    style={{
                      animation: 'voice-wave 0.3s ease-in-out infinite',
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-purple-400 font-medium">{tutor.name} is speaking...</p>
            </div>
          )}
          {isListening && (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-[3px] h-6 mb-1.5">
                {[1,2,3,4,5].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-red-500 rounded-full animate-pulse"
                    style={{
                      height: `${8 + Math.sin(i * 1.2) * 10}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.4s',
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-red-400 font-medium">Recording...</p>
            </div>
          )}
          {isThinking && (
            <div className="flex flex-col items-center">
              <div className="flex gap-1.5 mb-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-amber-400 font-medium">Thinking...</p>
            </div>
          )}
          {status === 'idle' && (
            <p className="text-[10px] text-white/30">Tap to speak...</p>
          )}
        </div>
      </div>

      {/* Bottom control panel */}
      <div className="px-3 pb-3 pt-1">
        <div className="flex gap-2 mb-2">
          {/* Main mic button */}
          <div
            className={`flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-[11px] transition-all ${
              isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {isListening ? 'Stop' : 'Reply'}
          </div>
          {/* Done button */}
          <div className="px-4 py-2.5 rounded-xl text-[11px] bg-white/10 text-white border border-white/10 flex items-center">
            Done
          </div>
        </div>
        {/* Timer */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-white/30 font-medium">{timer} / 10:00</span>
        </div>
      </div>
    </div>
  );
}
