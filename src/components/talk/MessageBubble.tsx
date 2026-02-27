'use client';

import { useState } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  tutorName?: string;
  onCopy?: (text: string) => void;
  onPlayAudio?: (text: string) => void;
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  tutorName,
  onCopy,
  onPlayAudio,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = role === 'user';

  const handleCopy = () => {
    if (onCopy) {
      onCopy(content);
    } else {
      navigator.clipboard.writeText(content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePlayAudio = () => {
    onPlayAudio?.(content);
  };

  return (
    <div
      className={`flex w-full ${
        isUser
          ? 'justify-end motion-safe:animate-slide-in-right'
          : 'justify-start motion-safe:animate-slide-in-left'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative max-w-[85%] sm:max-w-[75%] group ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Tutor name label */}
        {!isUser && tutorName && (
          <p className="text-xs font-medium mb-1 ml-1" style={{ color: 'var(--text-muted)' }}>
            {tutorName}
          </p>
        )}

        {/* Message bubble */}
        <div className={isUser ? 'message-user' : 'message-ai'}>
          <p className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words ${
            isUser ? 'text-white' : ''
          }`}
            style={!isUser ? { color: 'var(--text-primary)' } : undefined}
          >
            {content}
          </p>
        </div>

        {/* Bottom row: timestamp + action buttons */}
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {/* Timestamp */}
          {timestamp && (
            <span
              className="text-2xs select-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {timestamp}
            </span>
          )}

          {/* Action buttons - visible on hover */}
          <div
            className={`flex items-center gap-1 transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="p-1 rounded-md transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Copy message"
            >
              {copied ? (
                <svg
                  className="w-3.5 h-3.5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  style={{ color: 'var(--text-muted)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>

            {/* Play audio button - AI messages only */}
            {!isUser && onPlayAudio && (
              <button
                onClick={handlePlayAudio}
                className="p-1 rounded-md transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Play audio"
              >
                <svg
                  className="w-3.5 h-3.5"
                  style={{ color: 'var(--text-muted)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 010 7.07" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
