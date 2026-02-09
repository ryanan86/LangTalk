'use client';

interface ShadowingUIProps {
  sentence: string;
  index: number;
  total: number;
  onPlay: () => void;
  onNext: () => void;
  onSkip: () => void;
  isPlaying: boolean;
  language: 'ko' | 'en';
}

export default function ShadowingUI({
  sentence,
  index,
  total,
  onPlay,
  onNext,
  onSkip,
  isPlaying,
  language,
}: ShadowingUIProps) {
  const isKo = language === 'ko';
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;

  // SVG progress ring dimensions
  const ringSize = 96;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center px-4 animate-fade-in">
      {/* Progress indicator */}
      <div className="mb-6 text-center">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {isKo ? `문장 ${index + 1} / ${total}` : `Sentence ${index + 1} of ${total}`}
        </span>

        {/* Progress bar */}
        <div
          className="mt-2 w-48 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--surface-hover)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--voice-bar-from), var(--voice-bar-to))',
            }}
          />
        </div>
      </div>

      {/* Large play button with progress ring */}
      <div className="relative mb-8">
        {/* Progress ring SVG */}
        <svg
          className="timer-circle"
          width={ringSize}
          height={ringSize}
        >
          {/* Background circle */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke="var(--primary)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Play/Pause button in center */}
        <button
          onClick={onPlay}
          className={`
            absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-200 active:scale-95
            ${isPlaying
              ? 'bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-400 dark:to-primary-600 shadow-primary'
              : 'hover:shadow-primary'
            }
          `}
          style={{
            background: isPlaying
              ? undefined
              : 'linear-gradient(135deg, var(--primary), var(--voice-bar-to))',
            boxShadow: isPlaying
              ? undefined
              : '0 4px 20px var(--primary-glow)',
          }}
          aria-label={isPlaying ? (isKo ? '재생 중' : 'Playing') : (isKo ? '재생' : 'Play')}
        >
          {isPlaying ? (
            /* Audio wave animation when playing */
            <div className="flex items-end gap-0.5 h-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="voice-bar"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
          ) : (
            /* Play icon */
            <svg
              className="w-7 h-7 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
      </div>

      {/* Sentence display */}
      <div
        className="card-premium p-6 sm:p-8 w-full text-center mb-8"
      >
        <p
          className="text-lg sm:text-xl md:text-2xl leading-relaxed font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {sentence}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 w-full">
        {/* Skip button */}
        <button
          onClick={onSkip}
          className="btn-secondary flex-1 text-sm sm:text-base flex items-center justify-center gap-1.5"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          {isKo ? '건너뛰기' : 'Skip'}
        </button>

        {/* Repeat button */}
        <button
          onClick={onPlay}
          className="btn-secondary flex-shrink-0 text-sm sm:text-base flex items-center justify-center gap-1.5 px-4"
          disabled={isPlaying}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isKo ? '다시 듣기' : 'Repeat'}
        </button>

        {/* Next button */}
        <button
          onClick={onNext}
          className="btn-primary flex-1 text-sm sm:text-base flex items-center justify-center gap-1.5"
        >
          {index < total - 1
            ? (isKo ? '다음' : 'Next')
            : (isKo ? '완료' : 'Done')
          }
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
