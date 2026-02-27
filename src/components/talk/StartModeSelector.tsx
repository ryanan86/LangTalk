'use client';

import { useLanguage } from '@/lib/i18n';
import TutorAvatar from '@/components/TutorAvatar';

export type StartMode = 'free-talk' | 'topic-guided' | 'tutor-first' | 'warmup';

interface StartModeSelectorProps {
  tutorId: string;
  tutorName: string;
  recommendedMode?: StartMode;
  onSelect: (mode: StartMode) => void;
  onBack: () => void;
}

const MODE_ICONS: Record<StartMode, string> = {
  'free-talk': 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  'topic-guided': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  'tutor-first': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  'warmup': 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
};

export default function StartModeSelector({
  tutorId,
  tutorName,
  recommendedMode = 'tutor-first',
  onSelect,
  onBack,
}: StartModeSelectorProps) {
  const { language } = useLanguage();

  const modes: {
    id: StartMode;
    titleKo: string;
    titleEn: string;
    descKo: string;
    descEn: string;
    tagKo: string;
    tagEn: string;
  }[] = [
    {
      id: 'free-talk',
      titleKo: '자유 대화',
      titleEn: 'Free Talk',
      descKo: '아무 주제나 자유롭게 말해보세요',
      descEn: 'Speak freely about anything you want',
      tagKo: '자신감 있는 분',
      tagEn: 'For confident speakers',
    },
    {
      id: 'topic-guided',
      titleKo: '주제 선택',
      titleEn: 'Pick a Topic',
      descKo: '추천 주제 중 하나를 골라 시작하세요',
      descEn: 'Choose a topic to get started',
      tagKo: '주제가 필요할 때',
      tagEn: 'When you need a topic',
    },
    {
      id: 'tutor-first',
      titleKo: '튜터가 먼저',
      titleEn: 'Tutor Starts',
      descKo: '튜터가 먼저 말을 걸어요',
      descEn: 'Your tutor starts the conversation',
      tagKo: '추천',
      tagEn: 'Recommended',
    },
    {
      id: 'warmup',
      titleKo: '따라 말하기로 시작',
      titleEn: 'Warm Up First',
      descKo: '간단한 문장을 따라한 후 대화 시작',
      descEn: 'Practice phrases before chatting',
      tagKo: '처음이신 분',
      tagEn: 'For beginners',
    },
  ];

  const isKo = language === 'ko';

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <TutorAvatar tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'} size="sm" />
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {isKo
                ? `${tutorName}님과 어떻게 시작할까요?`
                : `How would you like to start with ${tutorName}?`}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isKo ? '원하는 방식을 선택하세요' : 'Choose your preferred way'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Cards */}
      <div className="flex-1 flex flex-col gap-3">
        {modes.map((mode) => {
          const isRecommended = mode.id === recommendedMode;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                isRecommended
                  ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-md shadow-primary-500/10'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:border-primary-300 dark:hover:border-primary-600'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isRecommended
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={MODE_ICONS[mode.id]} />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base">
                      {isKo ? mode.titleKo : mode.titleEn}
                    </span>
                    {isRecommended && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-primary-500 text-white rounded-full">
                        {isKo ? mode.tagKo : mode.tagEn}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                    {isKo ? mode.descKo : mode.descEn}
                  </p>
                  {!isRecommended && (
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {isKo ? mode.tagKo : mode.tagEn}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-neutral-300 dark:text-neutral-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
