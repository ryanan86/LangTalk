'use client';

import { useEffect, useRef } from 'react';

interface CorrectionCardProps {
  original: string;
  intended: string;
  corrected: string;
  explanation: string;
  category: string;
  isRepeated?: boolean;
  correctionIndex: number;

  isPlaying?: boolean;
  onPlayCorrected?: () => void;
  onPlayExplanation?: () => void;
  language?: string;
}

// Compute a simple word-level diff between original and corrected.
// Returns an array of tokens: { text, type: 'same' | 'removed' | 'added' }
function computeInlineDiff(
  original: string,
  corrected: string
): Array<{ text: string; type: 'same' | 'removed' | 'added' }> {
  const origWords = original.split(/(\s+)/);
  const corrWords = corrected.split(/(\s+)/);

  // LCS-based diff (Wagner-Fischer DP on word arrays)
  const m = origWords.length;
  const n = corrWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1].toLowerCase() === corrWords[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Traceback
  const tokens: Array<{ text: string; type: 'same' | 'removed' | 'added' }> = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      origWords[i - 1].toLowerCase() === corrWords[j - 1].toLowerCase()
    ) {
      tokens.unshift({ text: origWords[i - 1], type: 'same' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ text: corrWords[j - 1], type: 'added' });
      j--;
    } else {
      tokens.unshift({ text: origWords[i - 1], type: 'removed' });
      i--;
    }
  }

  // Collapse adjacent whitespace-only tokens of same type
  return tokens.filter((t) => t.text.trim() !== '');
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  );
}

function SpinnerIcon({ color }: { color: string }) {
  return (
    <div
      className={`w-4 h-4 border-2 ${color} border-t-transparent rounded-full animate-spin`}
    />
  );
}

export default function CorrectionCard({
  original,
  intended,
  corrected,
  explanation,
  category,
  isRepeated = false,
  correctionIndex,

  isPlaying = false,
  onPlayCorrected,
  onPlayExplanation,
  language = 'en',
}: CorrectionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Re-trigger slide-up animation whenever the correction changes
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove('correction-card-enter');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('correction-card-enter');
  }, [correctionIndex]);

  const diffTokens = computeInlineDiff(original, corrected);
  const hasRealDiff = diffTokens.some((t) => t.type !== 'same');

  const isKo = language === 'ko';

  return (
    <div
      ref={cardRef}
      className="correction-card-enter report-glass rounded-2xl overflow-hidden"
    >
      {/* Repeated pattern banner */}
      {isRepeated && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/[0.08] border-b border-amber-500/20">
          <svg
            className="w-4 h-4 text-amber-300 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-xs font-medium text-amber-300">
            {isKo
              ? `반복되는 실수 패턴 — 이전 세션에서도 "${category}" 관련 교정이 있었습니다`
              : `Recurring pattern — you had "${category}" corrections in previous sessions too`}
          </span>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* --- Inline diff block --- */}
        <div className="correction-diff-block rounded-xl p-4 sm:p-5">
          <div className="correction-diff-label">
            {isKo ? '교정 비교' : 'Inline diff'}
          </div>

          {hasRealDiff ? (
            <p className="correction-diff-text leading-relaxed">
              {diffTokens.map((token, idx) => {
                if (token.type === 'removed') {
                  return (
                    <span key={idx} className="correction-token-removed">
                      {token.text}
                    </span>
                  );
                }
                if (token.type === 'added') {
                  return (
                    <span key={idx} className="correction-token-added">
                      {token.text}
                    </span>
                  );
                }
                return (
                  <span key={idx} className="correction-token-same">
                    {token.text}
                  </span>
                );
              })}
            </p>
          ) : (
            /* Fallback: stacked original → corrected when diff is trivial */
            <div className="space-y-2">
              <p className="correction-token-removed text-base sm:text-lg">
                {original}
              </p>
              <div className="correction-arrow-row">
                <span className="correction-arrow">→</span>
              </div>
              <p className="correction-token-added text-base sm:text-lg font-semibold">
                {corrected}
              </p>
            </div>
          )}
        </div>

        {/* --- What you meant (intended) --- */}
        {intended && intended !== original && (
          <div className="px-4 py-3 dark:bg-white/[0.04] bg-black/[0.03] rounded-xl border border-white/[0.04]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {isKo ? '의도한 의미' : 'What you meant'}
            </span>
            <p className="dark:text-slate-300 text-zinc-600 mt-1.5 text-sm sm:text-base">
              {intended}
            </p>
          </div>
        )}

        {/* --- Corrected sentence with TTS --- */}
        <div className="correction-corrected-row">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest block mb-1.5">
              {isKo ? '올바른 표현' : 'Correct form'}
            </span>
            <p className="text-base sm:text-lg text-emerald-300 font-semibold leading-snug">
              {corrected}
            </p>
          </div>
          {onPlayCorrected && (
            <button
              onClick={onPlayCorrected}
              disabled={isPlaying}
              className="correction-tts-btn correction-tts-emerald"
              aria-label={isKo ? '올바른 표현 듣기' : 'Listen to corrected form'}
            >
              {isPlaying ? (
                <SpinnerIcon color="border-emerald-400" />
              ) : (
                <SpeakerIcon className="w-5 h-5 text-emerald-400" />
              )}
            </button>
          )}
        </div>

        {/* --- Explanation + category --- */}
        <div className="p-3 sm:p-4 bg-violet-500/[0.06] rounded-xl border border-violet-500/[0.1]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">
                {isKo ? '이유' : 'Why'}
              </span>
              <p className="text-slate-300 mt-1.5 text-xs sm:text-sm leading-relaxed">
                {explanation}
              </p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="inline-block px-2 py-1 text-xs rounded-full bg-violet-500/15 text-violet-300">
                  {category}
                </span>
                {isRepeated && (
                  <span className="inline-block px-2 py-0.5 bg-red-500/15 text-red-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {isKo ? '습관 주의' : 'Habit Alert'}
                  </span>
                )}
              </div>
            </div>
            {onPlayExplanation && (
              <button
                onClick={onPlayExplanation}
                disabled={isPlaying}
                className="correction-tts-btn correction-tts-violet"
                aria-label={isKo ? '설명 듣기' : 'Listen to explanation'}
              >
                {isPlaying ? (
                  <SpinnerIcon color="border-violet-400" />
                ) : (
                  <SpeakerIcon className="w-4 h-4 text-violet-400" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
