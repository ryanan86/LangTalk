'use client';

interface QuickActionsProps {
  correctionsToReview: number;
  hasProfile: boolean;
  language: 'ko' | 'en';
  onNavigate: (path: string) => void;
}

export default function QuickActions({
  correctionsToReview,
  hasProfile,
  language,
  onNavigate,
}: QuickActionsProps) {
  if (correctionsToReview <= 0 && hasProfile) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-6">
      {/* Review Reminder Widget */}
      {correctionsToReview > 0 && (
        <button
          onClick={() => onNavigate('/review')}
          className="group relative w-full overflow-hidden rounded-3xl bg-white p-5 text-left shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:scale-[1.01] hover:shadow-lg border border-neutral-100 dark:bg-neutral-900 dark:shadow-none dark:border-white/[0.06]"
        >
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/20" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-neutral-900 dark:text-white">
                  {language === 'ko' ? '복습할 항목' : 'Due for Review'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  {correctionsToReview}
                </span>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5">
                {language === 'ko' ? '지금 복습하고 기억을 강화하세요' : 'Strengthen your memory now'}
              </p>
            </div>
            <svg className="w-5 h-5 text-amber-500/50 flex-shrink-0 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}

      {/* Profile Setup Widget */}
      {!hasProfile && (
        <button
          onClick={() => onNavigate('/profile')}
          className="group relative w-full overflow-hidden rounded-3xl bg-white p-5 text-left shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:scale-[1.01] hover:shadow-lg border border-neutral-100 dark:bg-neutral-900 dark:shadow-none dark:border-white/[0.06]"
        >
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-neutral-900 dark:text-white">
                  {language === 'ko' ? '학습 프로필 설정' : 'Set Up Profile'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  {language === 'ko' ? '추천' : 'New'}
                </span>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5">
                {language === 'ko' ? '맞춤형 학습을 위해 프로필을 완성하세요' : 'Complete your profile for personalized learning'}
              </p>
            </div>
            <svg className="w-5 h-5 text-indigo-500/50 flex-shrink-0 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}
    </div>
  );
}
