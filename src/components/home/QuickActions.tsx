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
          className="relative group p-4 rounded-2xl bg-amber-50 dark:bg-neutral-800 border border-amber-200 dark:border-amber-500/30 hover:border-amber-300 dark:hover:border-amber-500/50 transition-all text-left"
        >
          <div className="absolute inset-0 rounded-2xl bg-amber-100/50 dark:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-neutral-900 dark:text-white font-medium">
                  {language === 'ko' ? '복습할 항목' : 'Due for Review'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
                  {correctionsToReview}
                </span>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                {language === 'ko' ? '지금 복습하고 기억을 강화하세요' : 'Strengthen your memory now'}
              </p>
            </div>
            <svg className="w-5 h-5 text-neutral-300 dark:text-neutral-500 group-hover:text-neutral-500 dark:group-hover:text-neutral-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}

      {/* Profile Setup Widget */}
      {!hasProfile && (
        <button
          onClick={() => onNavigate('/profile')}
          className="relative group p-4 rounded-2xl bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all text-left"
        >
          <div className="absolute inset-0 rounded-2xl bg-indigo-100/50 dark:bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-gradient-to-br dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-neutral-900 dark:text-white font-medium">
                  {language === 'ko' ? '학습 프로필 설정' : 'Set Up Profile'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs">
                  {language === 'ko' ? '추천' : 'New'}
                </span>
              </div>
              <p className="text-neutral-400 dark:text-white/40 text-xs mt-0.5">
                {language === 'ko' ? '맞춤형 학습을 위해 프로필을 완성하세요' : 'Complete your profile for personalized learning'}
              </p>
            </div>
            <svg className="w-5 h-5 text-neutral-300 dark:text-white/30 group-hover:text-neutral-500 dark:group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}
    </div>
  );
}
