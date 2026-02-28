'use client';

import type { Language } from '@/lib/i18n';
import { useState, useCallback, useEffect } from 'react';
import TapTalkLogo from '@/components/TapTalkLogo';
import MicTestStep from './MicTestStep';
import TutorIntroCarousel from './TutorIntroCarousel';

interface OnboardingFlowProps {
  onComplete: () => void;
  language: Language;
}

interface ProfileType {
  id: string;
  labelEn: string;
  labelKo: string;
  descEn: string;
  descKo: string;
  icon: string;
}

interface InterestOption {
  id: string;
  labelEn: string;
  labelKo: string;
}

const STORAGE_KEY = 'taptalk-onboarding-complete';
const TOTAL_STEPS = 6;

const profileTypes: ProfileType[] = [
  {
    id: 'elementary_student',
    labelEn: 'Elementary Student',
    labelKo: '초등학생',
    descEn: 'Basic conversations, hobbies, school life',
    descKo: '기초 대화, 취미, 학교 생활',
    icon: 'M4 7V4a1 1 0 011-1h3M4 7H3m1 0h16M20 7h1m-1 0V4a1 1 0 00-1-1h-3m-2 7v10M8 10v10m0 0h8m-8 0H4a1 1 0 01-1-1v-3m13 4h4a1 1 0 001-1v-3',
  },
  {
    id: 'middle_student',
    labelEn: 'Middle School Student',
    labelKo: '중학생',
    descEn: 'School subjects, friends, everyday topics',
    descKo: '학교 과목, 친구, 일상 주제',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
  {
    id: 'college_student',
    labelEn: 'College Student',
    labelKo: '대학생',
    descEn: 'Academic discussions, presentations, campus life',
    descKo: '학술 토론, 발표, 캠퍼스 생활',
    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  },
  {
    id: 'office_worker',
    labelEn: 'Office Worker',
    labelKo: '직장인',
    descEn: 'Emails, meetings, presentations, business English',
    descKo: '이메일, 회의, 발표, 비즈니스 영어',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    id: 'traveler',
    labelEn: 'Traveler',
    labelKo: '여행자',
    descEn: 'Hotels, restaurants, directions, sightseeing',
    descKo: '호텔, 식당, 길 찾기, 관광',
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'parent',
    labelEn: 'Parent',
    labelKo: '학부모',
    descEn: 'School communication, playdates, parent-teacher meetings',
    descKo: '학교 소통, 플레이데이트, 학부모 상담',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
];

const interestOptions: InterestOption[] = [
  { id: 'technology', labelEn: 'Technology', labelKo: '기술' },
  { id: 'travel', labelEn: 'Travel', labelKo: '여행' },
  { id: 'food', labelEn: 'Food & Cooking', labelKo: '음식 & 요리' },
  { id: 'sports', labelEn: 'Sports', labelKo: '스포츠' },
  { id: 'music', labelEn: 'Music', labelKo: '음악' },
  { id: 'movies', labelEn: 'Movies & TV', labelKo: '영화 & TV' },
  { id: 'gaming', labelEn: 'Gaming', labelKo: '게임' },
  { id: 'business', labelEn: 'Business', labelKo: '비즈니스' },
  { id: 'health', labelEn: 'Health & Fitness', labelKo: '건강 & 운동' },
  { id: 'parenting', labelEn: 'Parenting', labelKo: '육아' },
  { id: 'art', labelEn: 'Art & Design', labelKo: '예술 & 디자인' },
  { id: 'science', labelEn: 'Science', labelKo: '과학' },
];

export default function OnboardingFlow({ onComplete, language }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);

  // Profile data
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<string | undefined>(undefined);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const goToStep = useCallback((step: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(step > currentStep ? 'forward' : 'backward');
    setCurrentStep(step);
    setTimeout(() => setIsAnimating(false), 400);
  }, [currentStep, isAnimating]);

  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  const handleComplete = async () => {
    // Save onboarding data
    try {
      const res = await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileType: selectedProfile,
          interests: selectedInterests,
        }),
      });
      if (!res.ok) {
        console.error('Failed to save profile during onboarding:', res.status);
        return;
      }
    } catch (error) {
      console.error('Failed to save profile during onboarding:', error);
      return;
    }

    // Mark onboarding as complete (only after successful save)
    localStorage.setItem(STORAGE_KEY, 'true');

    // If a tutor was selected, save it
    if (selectedTutor) {
      localStorage.setItem('taptalk-selected-tutor', selectedTutor);
    }

    onComplete();
  };

  // Slide transition classes
  const getSlideClass = () => {
    if (direction === 'forward') {
      return 'animate-slide-in-right';
    }
    return 'animate-slide-in-left';
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-50 dark:bg-dark-bg overflow-hidden">
      {/* Progress Dots */}
      <div className="absolute top-0 left-0 right-0 pt-[env(safe-area-inset-top)] px-4 py-4 z-10">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <div
              key={index}
              className={`
                h-1.5 rounded-full transition-all duration-500
                ${index === currentStep
                  ? 'w-8 bg-primary-500'
                  : index < currentStep
                    ? 'w-1.5 bg-primary-300 dark:bg-primary-600'
                    : 'w-1.5 bg-neutral-300 dark:bg-neutral-700'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Navigation: Back + Skip */}
      <div className="absolute top-0 left-0 right-0 pt-[env(safe-area-inset-top)] px-4 py-3 z-10 flex items-center justify-between">
        {/* Back Button (steps 2-6) */}
        {currentStep > 0 ? (
          <button
            onClick={prevStep}
            className="p-2 -ml-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-10" />
        )}

        {/* Step indicator in center - pushed down to avoid overlap with dots */}
        <div className="h-10" />

        {/* Skip Button (steps 2-4) */}
        {currentStep >= 1 && currentStep <= 3 ? (
          <button
            onClick={nextStep}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors px-2 py-1"
          >
            {language === 'ko' ? '건너뛰기' : 'Skip'}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Main Content Area */}
      <div className="h-full flex flex-col pt-16 pb-[env(safe-area-inset-bottom)]">
        <div
          key={currentStep}
          className={`flex-1 flex flex-col justify-center overflow-y-auto ${getSlideClass()}`}
        >
          {/* Step 1: Welcome */}
          {currentStep === 0 && (
            <div className="flex flex-col items-center justify-center text-center px-6 py-8">
              <div className="mb-8">
                <TapTalkLogo size="lg" className="justify-center" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                {language === 'ko' ? 'TapTalk에 오신 것을 환영합니다!' : 'Welcome to TapTalk!'}
              </h1>
              <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-sm leading-relaxed mb-4">
                {language === 'ko'
                  ? 'AI 튜터와 함께 영어 회화를 연습하세요. 자유롭게 말하고, 자연스러운 대화를 나누고, 상세한 피드백을 받아보세요.'
                  : 'Practice English conversation with AI tutors. Speak freely, have natural conversations, and get detailed feedback.'}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500 max-w-xs">
                {language === 'ko'
                  ? '빠르게 프로필을 설정하고 바로 시작해보세요.'
                  : 'Set up your profile quickly and start right away.'}
              </p>

              <div className="mt-10 w-full max-w-xs">
                <button
                  onClick={nextStep}
                  className="btn-primary py-4 text-lg w-full"
                >
                  {language === 'ko' ? '시작하기' : 'Get Started'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Profile Type */}
          {currentStep === 1 && (
            <div className="flex flex-col px-6 py-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  {language === 'ko' ? '나는 어떤 사람인가요?' : 'What describes you best?'}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {language === 'ko'
                    ? '맞춤 대화 주제와 난이도를 설정합니다.'
                    : 'This helps us tailor topics and difficulty.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
                {profileTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedProfile(type.id)}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-left
                      ${selectedProfile === type.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-md shadow-primary-500/10'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-surface hover:border-neutral-300 dark:hover:border-neutral-600'
                      }
                    `}
                  >
                    <svg className="w-8 h-8 mb-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={type.icon} />
                    </svg>
                    <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                      {language === 'ko' ? type.labelKo : type.labelEn}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 block leading-snug">
                      {language === 'ko' ? type.descKo : type.descEn}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 w-full max-w-md mx-auto">
                <button
                  onClick={nextStep}
                  disabled={!selectedProfile}
                  className="btn-primary py-3 text-base w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {language === 'ko' ? '다음' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Interests */}
          {currentStep === 2 && (
            <div className="flex flex-col items-center px-6 py-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                  {language === 'ko' ? '관심사를 선택하세요' : 'Select Your Interests'}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {language === 'ko'
                    ? '대화 주제를 맞춤화합니다. 여러 개 선택 가능!'
                    : 'We\'ll personalize your topics. Pick as many as you like!'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center max-w-md">
                {interestOptions.map(interest => (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`
                      px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                      ${selectedInterests.includes(interest.id)
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20 scale-105'
                        : 'bg-white dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }
                    `}
                  >
                    {language === 'ko' ? interest.labelKo : interest.labelEn}
                  </button>
                ))}
              </div>

              {selectedInterests.length > 0 && (
                <p className="mt-4 text-sm text-primary-500 font-medium">
                  {language === 'ko'
                    ? `${selectedInterests.length}개 선택됨`
                    : `${selectedInterests.length} selected`}
                </p>
              )}

              <div className="mt-6 w-full max-w-xs">
                <button
                  onClick={nextStep}
                  className="btn-primary py-3 text-base w-full"
                >
                  {selectedInterests.length > 0
                    ? (language === 'ko' ? '다음' : 'Next')
                    : (language === 'ko' ? '나중에 선택할게요' : 'I\'ll pick later')
                  }
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Mic Test */}
          {currentStep === 3 && (
            <div className="flex flex-col items-center justify-center px-6 py-4">
              <MicTestStep
                onComplete={nextStep}
                onSkip={nextStep}
                language={language}
              />
            </div>
          )}

          {/* Step 5: Tutor Intro */}
          {currentStep === 4 && (
            <div className="flex flex-col items-center px-2 py-4 overflow-hidden">
              <TutorIntroCarousel
                onComplete={(tutorId) => {
                  setSelectedTutor(tutorId);
                  nextStep();
                }}
                language={language}
              />
            </div>
          )}

          {/* Step 6: Ready */}
          {currentStep === 5 && (
            <div className="flex flex-col items-center justify-center text-center px-6 py-8">
              {/* Celebration animation */}
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                  <svg className="w-14 h-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {/* Decorative particles */}
                <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-amber-400 animate-bounce-soft" style={{ animationDelay: '0s' }} />
                <div className="absolute -top-1 -right-3 w-3 h-3 rounded-full bg-pink-400 animate-bounce-soft" style={{ animationDelay: '0.3s' }} />
                <div className="absolute -bottom-2 -left-4 w-3 h-3 rounded-full bg-blue-400 animate-bounce-soft" style={{ animationDelay: '0.6s' }} />
                <div className="absolute -bottom-1 -right-2 w-4 h-4 rounded-full bg-green-400 animate-bounce-soft" style={{ animationDelay: '0.9s' }} />
                <div className="absolute top-1/2 -left-6 w-2 h-2 rounded-full bg-purple-400 animate-bounce-soft" style={{ animationDelay: '0.15s' }} />
                <div className="absolute top-1/2 -right-5 w-2.5 h-2.5 rounded-full bg-rose-400 animate-bounce-soft" style={{ animationDelay: '0.45s' }} />
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
                {language === 'ko' ? '모든 준비가 끝났어요!' : "You're All Set!"}
              </h1>
              <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-sm leading-relaxed mb-2">
                {language === 'ko'
                  ? '이제 AI 튜터와 영어 대화를 시작해보세요. 매일 조금씩 연습하면 실력이 쑥쑥 늘어요!'
                  : 'Start practicing English with your AI tutors. A little practice each day goes a long way!'}
              </p>

              {/* Summary */}
              {(selectedProfile || selectedInterests.length > 0) && (
                <div className="mt-4 mb-2 p-4 rounded-xl bg-white dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700 max-w-sm w-full text-left">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 font-medium">
                    {language === 'ko' ? '내 프로필' : 'Your Profile'}
                  </p>
                  {selectedProfile && (
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={profileTypes.find(p => p.id === selectedProfile)?.icon} />
                      </svg>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">
                        {language === 'ko'
                          ? profileTypes.find(p => p.id === selectedProfile)?.labelKo
                          : profileTypes.find(p => p.id === selectedProfile)?.labelEn}
                      </p>
                    </div>
                  )}
                  {selectedInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedInterests.map(id => {
                        const interest = interestOptions.find(i => i.id === id);
                        return (
                          <span
                            key={id}
                            className="text-xs px-2 py-1 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                          >
                            {language === 'ko' ? interest?.labelKo : interest?.labelEn}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 w-full max-w-xs">
                <button
                  onClick={handleComplete}
                  className="btn-primary py-4 text-lg w-full"
                >
                  {language === 'ko' ? '학습 시작하기' : 'Start Learning'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframe styles for slide animations */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
