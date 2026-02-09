'use client';

import { useState } from 'react';

interface Correction {
  original: string;
  intended: string;
  corrected: string;
  explanation: string;
  category: string;
}

interface AnalysisCardProps {
  correction: Correction;
  index: number;
  total: number;
  onNext?: () => void;
}

const categoryConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  grammar: {
    label: 'Grammar',
    bg: 'bg-blue-100 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-500/30',
  },
  vocabulary: {
    label: 'Vocabulary',
    bg: 'bg-purple-100 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-500/30',
  },
  'sentence-structure': {
    label: 'Sentence Structure',
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  pronunciation: {
    label: 'Pronunciation',
    bg: 'bg-pink-100 dark:bg-pink-500/15',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-500/30',
  },
  other: {
    label: 'Other',
    bg: 'bg-neutral-100 dark:bg-neutral-500/15',
    text: 'text-neutral-600 dark:text-neutral-300',
    border: 'border-neutral-200 dark:border-neutral-500/30',
  },
};

function getCategoryStyle(category: string) {
  const normalized = category.toLowerCase().replace(/\s+/g, '-');
  return categoryConfig[normalized] || categoryConfig.other;
}

export default function AnalysisCard({
  correction,
  index,
  total,
  onNext,
}: AnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const catStyle = getCategoryStyle(correction.category);

  return (
    <div
      className="card-premium p-4 sm:p-5 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header: counter + category badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          Correction {index + 1} of {total}
        </span>

        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
        >
          {catStyle.label}
        </span>
      </div>

      {/* Side-by-side comparison */}
      <div className="flex items-start gap-3 mb-3">
        {/* Original */}
        <div className="flex-1 min-w-0">
          <p
            className="text-2xs uppercase tracking-wider font-semibold mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Original
          </p>
          <p className="text-sm sm:text-base leading-relaxed correction-original">
            {correction.original}
          </p>
        </div>

        {/* Arrow separator */}
        <div className="flex-shrink-0 pt-5">
          <svg
            className="w-5 h-5"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>

        {/* Corrected */}
        <div className="flex-1 min-w-0">
          <p
            className="text-2xs uppercase tracking-wider font-semibold mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Corrected
          </p>
          <p className="text-sm sm:text-base leading-relaxed correction-fixed">
            {correction.corrected}
          </p>
        </div>
      </div>

      {/* Intended meaning (if different from original) */}
      {correction.intended && correction.intended !== correction.original && (
        <div
          className="text-xs mb-3 px-3 py-2 rounded-lg"
          style={{
            background: 'var(--surface-hover)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="font-medium">Intended:</span> {correction.intended}
        </div>
      )}

      {/* Expandable explanation */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
          style={{ color: 'var(--primary)' }}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {isExpanded ? 'Hide explanation' : 'Show explanation'}
        </button>

        {isExpanded && (
          <div
            className="mt-2 text-sm leading-relaxed pl-5 animate-slide-up"
            style={{ color: 'var(--text-secondary)' }}
          >
            {correction.explanation}
          </div>
        )}
      </div>

      {/* Next button */}
      {onNext && index < total - 1 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onNext}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
          >
            Next
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
      )}
    </div>
  );
}
