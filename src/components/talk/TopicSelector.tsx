'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import type { TopicCard } from '@/lib/topicSuggestions';

interface TopicSelectorProps {
  topics: TopicCard[];
  onSelect: (topic: TopicCard) => void;
  onBack: () => void;
  onShuffle: () => void;
}

export default function TopicSelector({
  topics,
  onSelect,
  onBack,
  onShuffle,
}: TopicSelectorProps) {
  const { language } = useLanguage();
  const isKo = language === 'ko';
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categoryColors: Record<string, string> = {
    worker: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    student: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
    traveler: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    general: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  };

  const categoryLabels: Record<string, { ko: string; en: string }> = {
    worker: { ko: '직장인', en: 'Work' },
    student: { ko: '학생', en: 'Student' },
    traveler: { ko: '여행', en: 'Travel' },
    general: { ko: '일반', en: 'General' },
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            {isKo ? '어떤 주제로 이야기할까요?' : 'What would you like to talk about?'}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isKo ? '주제를 선택하면 대화 힌트가 제공됩니다' : 'Pick a topic to get a conversation starter'}
          </p>
        </div>
      </div>

      {/* Topic Cards */}
      <div className="flex-1 grid grid-cols-1 gap-3 content-start">
        {topics.slice(0, 4).map((topic) => (
          <button
            key={topic.id}
            onClick={() => {
              setSelectedId(topic.id);
              onSelect(topic);
            }}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
              selectedId === topic.id
                ? 'border-primary-400 bg-primary-50 dark:bg-primary-500/10 shadow-md'
                : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:border-primary-300 dark:hover:border-primary-600 hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base">
                  {isKo ? topic.titleKo : topic.titleEn}
                </span>
                <span className="text-neutral-400 dark:text-neutral-500 text-xs ml-2">
                  {isKo ? topic.titleEn : topic.titleKo}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                categoryColors[topic.category] || categoryColors.general
              }`}>
                {isKo ? categoryLabels[topic.category]?.ko : categoryLabels[topic.category]?.en}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 font-mono bg-primary-50 dark:bg-primary-500/10 rounded-lg px-3 py-2">
              &ldquo;{topic.starterHint}&rdquo;
            </p>
          </button>
        ))}
      </div>

      {/* Shuffle Button */}
      <button
        onClick={onShuffle}
        className="mt-4 flex items-center justify-center gap-2 py-3 text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {isKo ? '다른 주제 보기' : 'Show different topics'}
      </button>
    </div>
  );
}
