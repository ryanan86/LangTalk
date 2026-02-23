'use client';

import { useEffect, useCallback } from 'react';

interface LevelUpModalProps {
  level: number;
  previousLevel: number;
  onClose: () => void;
  isOpen: boolean;
}

export default function LevelUpModal({
  level,
  previousLevel,
  onClose,
  isOpen,
}: LevelUpModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const levelsGained = level - previousLevel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" />

      {/* Confetti Particles (CSS only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `-5%`,
              backgroundColor: [
                '#7C3AED',
                '#6366F1',
                '#F59E0B',
                '#10B981',
                '#3B82F6',
                '#8B5CF6',
              ][i % 6],
              animation: `confetti-fall ${2 + Math.random() * 2}s ease-in ${Math.random() * 1}s infinite`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>

      {/* Modal Content */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl card-premium p-8 text-center shadow-[var(--card-shadow-hover)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effect Behind Level Number */}
        <div className="relative mx-auto mb-6 w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 opacity-25 blur-2xl animate-glow" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-level-up">
            <span className="text-4xl font-bold text-white">{level}</span>
          </div>
        </div>

        {/* Header */}
        <h2 className="text-2xl font-bold text-theme-primary mb-2">
          New Level!
        </h2>

        {/* Congrats Message */}
        <p className="text-theme-secondary mb-4">
          {levelsGained > 1
            ? `You jumped ${levelsGained} levels! Amazing progress!`
            : 'Congratulations! Keep up the great work!'}
        </p>

        {/* XP Reward Display */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 mb-6">
          <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
          </svg>
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            Level {previousLevel} → Level {level}
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-base hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-violet-500/20"
        >
          Continue
        </button>
      </div>

      {/* CSS Keyframes for confetti and level-up animation */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes level-up-bounce {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        :global(.animate-level-up) {
          animation: level-up-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}
