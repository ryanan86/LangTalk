'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import ScheduleSettings from '@/components/settings/ScheduleSettings';
import BottomNav from '@/components/BottomNav';

interface ProfileType {
  id: string;
  labelEn: string;
  labelKo: string;
  descEn: string;
  descKo: string;
}

const profileTypes: ProfileType[] = [
  {
    id: 'elementary_student',
    labelEn: 'Elementary Student',
    labelKo: '초등학생',
    descEn: 'Basic conversations, hobbies, school life',
    descKo: '기초 대화, 취미, 학교 생활',
  },
  {
    id: 'middle_student',
    labelEn: 'Middle School Student',
    labelKo: '중학생',
    descEn: 'School subjects, friends, everyday topics',
    descKo: '학교 과목, 친구, 일상 주제',
  },
  {
    id: 'college_student',
    labelEn: 'College Student',
    labelKo: '대학생',
    descEn: 'Academic discussions, presentations, campus life',
    descKo: '학술 토론, 발표, 캠퍼스 생활',
  },
  {
    id: 'office_worker',
    labelEn: 'Office Worker',
    labelKo: '직장인',
    descEn: 'Emails, meetings, presentations, business English',
    descKo: '이메일, 회의, 발표, 비즈니스 영어',
  },
  {
    id: 'traveler',
    labelEn: 'Traveler',
    labelKo: '여행자',
    descEn: 'Hotels, restaurants, directions, sightseeing',
    descKo: '호텔, 식당, 길 찾기, 관광',
  },
  {
    id: 'parent',
    labelEn: 'Parent',
    labelKo: '학부모',
    descEn: 'School communication, playdates, parent-teacher meetings',
    descKo: '학교 소통, 플레이데이트, 학부모 상담',
  },
];

const interestOptions = [
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

export default function ProfilePage() {
  const router = useRouter();
  const { language } = useLanguage();

  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customContext, setCustomContext] = useState('');
  const [difficultyPreference, setDifficultyPreference] = useState<string>('adaptive');
  const [correctionLevel, setCorrectionLevel] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [schedule, setSchedule] = useState<{
    enabled: boolean;
    times: string[];
    days: number[];
    preferredTutor: string;
  } | undefined>(undefined);
  const [hasUnsavedSchedule, setHasUnsavedSchedule] = useState(false);
  const [showScheduleWarning, setShowScheduleWarning] = useState(false);
  const scheduleWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scheduleWarningTimeoutRef.current !== null) {
        clearTimeout(scheduleWarningTimeoutRef.current);
      }
    };
  }, []);

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user-profile');
        if (!response.ok) {
          throw new Error(`Failed to load profile: ${response.status}`);
        }
        const data = await response.json();

        if (data.profile) {
          setSelectedType(data.profile.profileType || '');
          setSelectedInterests(data.profile.interests || []);
          setCustomContext(data.profile.customContext || '');
          setDifficultyPreference(data.profile.difficultyPreference || 'adaptive');
          setCorrectionLevel(data.profile.correctionLevel || 2);
          if (data.profile.schedule) {
            setSchedule(data.profile.schedule);
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleScheduleSave = useCallback(async (scheduleData: {
    enabled: boolean;
    times: string[];
    days: number[];
    preferredTutor: string;
  }) => {
    try {
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: scheduleData }),
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setSchedule(scheduleData);
      } else {
        throw new Error('Failed to save schedule');
      }
    } catch (error) {
      console.error('Failed to save schedule:', error);
      throw error;
    }
  }, []);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSave = async () => {
    // Show warning if schedule has unsaved changes
    if (hasUnsavedSchedule) {
      setShowScheduleWarning(true);
      // Auto-hide after 5 seconds, tracked via ref for cleanup
      if (scheduleWarningTimeoutRef.current !== null) {
        clearTimeout(scheduleWarningTimeoutRef.current);
      }
      scheduleWarningTimeoutRef.current = setTimeout(() => {
        setShowScheduleWarning(false);
        scheduleWarningTimeoutRef.current = null;
      }, 5000);
      return;
    }

    await saveProfile();
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileType: selectedType,
          interests: selectedInterests,
          customContext,
          difficultyPreference,
          correctionLevel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        router.push('/');
      } else {
        alert(language === 'ko' ? '저장에 실패했습니다.' : 'Failed to save profile.');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert(language === 'ko' ? '저장에 실패했습니다.' : 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="flex gap-2">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-4 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {language === 'ko' ? '학습 프로필 설정' : 'Learning Profile'}
          </h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Notice */}
        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {language === 'ko'
              ? '개인화된 맞춤 학습을 위해 계정당 하나의 프로필만 지원합니다.'
              : 'Only one profile per account is supported for personalized learning.'}
          </p>
        </div>

        {/* Profile Type Section */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {language === 'ko' ? '나는 어떤 사람인가요?' : 'What describes you best?'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {language === 'ko'
              ? '선택하신 유형에 맞는 어휘와 상황을 우선 학습합니다.'
              : 'We\'ll prioritize vocabulary and scenarios relevant to you.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
            {profileTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedType === type.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-surface hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <span className="font-medium text-neutral-900 dark:text-white block text-sm">
                  {language === 'ko' ? type.labelKo : type.labelEn}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 block">
                  {language === 'ko' ? type.descKo : type.descEn}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Interests Section */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {language === 'ko' ? '관심사 선택' : 'Select Your Interests'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {language === 'ko'
              ? '대화 주제를 맞춤화하는 데 사용됩니다. (복수 선택 가능)'
              : 'Used to personalize conversation topics. (Select multiple)'}
          </p>

          <div className="flex flex-wrap gap-2">
            {interestOptions.map(interest => (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedInterests.includes(interest.id)
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                {language === 'ko' ? interest.labelKo : interest.labelEn}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Context Section */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {language === 'ko' ? '추가 정보 (선택)' : 'Additional Context (Optional)'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {language === 'ko'
              ? '더 구체적인 상황이나 목표가 있다면 알려주세요.'
              : 'Tell us about specific situations or goals you have.'}
          </p>

          <textarea
            value={customContext}
            onChange={e => setCustomContext(e.target.value)}
            placeholder={
              language === 'ko'
                ? '예: 미국 회사와 협업 중이며, 화상 회의를 자주 합니다.'
                : 'e.g., I work with US clients and have frequent video calls.'
            }
            className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-surface text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={3}
          />
        </section>

        {/* Difficulty Preference */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {language === 'ko' ? '학습 난이도' : 'Learning Difficulty'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {language === 'ko'
              ? '교정과 피드백의 난이도를 설정합니다.'
              : 'Set the difficulty level for corrections and feedback.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'easy', labelEn: 'Easy', labelKo: '쉬움', descEn: 'Simple corrections, basic vocabulary', descKo: '기본 교정, 쉬운 어휘' },
              { id: 'medium', labelEn: 'Medium', labelKo: '보통', descEn: 'Balanced corrections and vocabulary', descKo: '균형 잡힌 교정과 어휘' },
              { id: 'hard', labelEn: 'Hard', labelKo: '어려움', descEn: 'Advanced corrections, rich vocabulary', descKo: '고급 교정, 풍부한 어휘' },
              { id: 'adaptive', labelEn: 'Adaptive', labelKo: '자동 조절', descEn: 'Adjusts based on your performance', descKo: '성과에 따라 자동 조절' },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setDifficultyPreference(option.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  difficultyPreference === option.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-surface hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <span className="font-medium text-neutral-900 dark:text-white block text-sm">
                  {language === 'ko' ? option.labelKo : option.labelEn}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 block">
                  {language === 'ko' ? option.descKo : option.descEn}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Correction Level */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {language === 'ko' ? '교정 방식' : 'Correction Style'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {language === 'ko'
              ? '대화 중 교정의 강도를 설정합니다.'
              : 'Set how actively the tutor corrects your speech.'}
          </p>

          <div className="space-y-3">
            {[
              { level: 1, labelEn: 'Just Chat', labelKo: '편하게 대화', descEn: 'No corrections — just natural conversation', descKo: '교정 없이 편하게 대화만' },
              { level: 2, labelEn: 'Gentle Echo', labelKo: '살짝 알려줘', descEn: 'Tutor naturally echoes the correct form', descKo: '올바른 표현을 자연스럽게 반복' },
              { level: 3, labelEn: 'Soft Coach', labelKo: '부드럽게 코칭', descEn: 'Gentle tips during conversation', descKo: '대화 중 부드러운 팁 제공' },
              { level: 4, labelEn: 'Active Teach', labelKo: '적극 교정', descEn: 'Direct corrections with explanations', descKo: '직접적인 교정과 설명' },
            ].map(option => (
              <button
                key={option.level}
                onClick={() => setCorrectionLevel(option.level)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                  correctionLevel === option.level
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-surface hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  correctionLevel === option.level
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}>
                  {option.level}
                </span>
                <div>
                  <span className="font-medium text-neutral-900 dark:text-white block text-sm">
                    {language === 'ko' ? option.labelKo : option.labelEn}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 block">
                    {language === 'ko' ? option.descKo : option.descEn}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Schedule Settings */}
        <div data-schedule-section className="p-4 bg-white dark:bg-dark-surface rounded-xl border border-neutral-200 dark:border-neutral-700">
          <ScheduleSettings
            language={language as 'ko' | 'en'}
            initialSchedule={schedule}
            onSave={handleScheduleSave}
            onDirtyChange={setHasUnsavedSchedule}
          />
        </div>

        {/* Unsaved schedule warning */}
        {showScheduleWarning && (
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-xl">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {language === 'ko'
                ? '알림 스케줄이 아직 저장되지 않았습니다. 위의 "알림 설정 저장" 버튼을 먼저 눌러주세요.'
                : 'Schedule changes are not saved yet. Please click "Save Schedule" above first.'}
            </p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  setShowScheduleWarning(false);
                  // Scroll to schedule section
                  document.querySelector('[data-schedule-section]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                {language === 'ko' ? '스케줄 저장하러 가기' : 'Go Save Schedule'}
              </button>
              <button
                onClick={() => {
                  setShowScheduleWarning(false);
                  saveProfile();
                }}
                className="flex-1 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {language === 'ko' ? '프로필만 저장' : 'Save Profile Only'}
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedType}
            className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? (language === 'ko' ? '저장 중...' : 'Saving...')
              : (language === 'ko' ? '프로필 저장' : 'Save Profile')}
          </button>

          {!selectedType && (
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-3">
              {language === 'ko' ? '프로필 유형을 선택해주세요.' : 'Please select a profile type.'}
            </p>
          )}
        </div>
      </main>
      {/* Bottom nav spacer */}
      <div className="h-20" />
      <BottomNav />
    </div>
  );
}
