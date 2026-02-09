'use client';

interface RecordingButtonProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  audioLevel?: number;
  disabled?: boolean;
}

export default function RecordingButton({
  isRecording,
  onStartRecording,
  onStopRecording,
  audioLevel = 0,
  disabled = false,
}: RecordingButtonProps) {
  const clampedLevel = Math.max(0, Math.min(1, audioLevel));

  const handleClick = () => {
    if (disabled) return;
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Audio level visualization rings */}
      {isRecording && (
        <>
          {/* Outermost ring */}
          <div
            className="absolute rounded-full border-2 border-red-400/30 dark:border-red-500/30 animate-pulse-ring-recording"
            style={{
              width: `${64 + 48 * clampedLevel}px`,
              height: `${64 + 48 * clampedLevel}px`,
              transition: 'width 0.1s ease-out, height 0.1s ease-out',
            }}
          />
          {/* Middle ring */}
          <div
            className="absolute rounded-full border-2 border-red-400/40 dark:border-red-500/40"
            style={{
              width: `${64 + 32 * clampedLevel}px`,
              height: `${64 + 32 * clampedLevel}px`,
              transition: 'width 0.1s ease-out, height 0.1s ease-out',
              animationDelay: '0.2s',
            }}
          />
          {/* Innermost ring */}
          <div
            className="absolute rounded-full border-2 border-red-400/50 dark:border-red-500/50"
            style={{
              width: `${64 + 16 * clampedLevel}px`,
              height: `${64 + 16 * clampedLevel}px`,
              transition: 'width 0.1s ease-out, height 0.1s ease-out',
              animationDelay: '0.4s',
            }}
          />
        </>
      )}

      {/* Pulsing background glow when recording */}
      {isRecording && (
        <div
          className="absolute w-16 h-16 rounded-full recording-active"
          style={{
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Idle glow */}
      {!isRecording && !disabled && (
        <div
          className="absolute w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Main button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          relative z-10 w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-200 select-none-touch
          active:scale-95
          ${disabled
            ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed'
            : isRecording
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
              : 'bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-700 hover:shadow-lg shadow-primary'
          }
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          /* Stop icon */
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          /* Microphone icon */
          <svg
            className={`w-7 h-7 text-white ${disabled ? 'opacity-50' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 10v2a7 7 0 01-14 0v-2"
            />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
    </div>
  );
}
