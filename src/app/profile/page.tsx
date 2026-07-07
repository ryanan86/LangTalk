'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n';
import ScheduleSettings from '@/components/settings/ScheduleSettings';
import BottomNav from '@/components/BottomNav';
import { SHOP_ITEMS } from '@/lib/shopItems';
import { Card, Badge } from '@/components/ui'; // eslint-disable-line @typescript-eslint/no-unused-vars

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

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

// ── Chevron icon reused across settings rows ───────────────────────────────────
function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { language } = useLanguage();
  const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const scheduleWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inventory, setInventory] = useState<{ itemId: string; quantity: number; acquiredAt: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [familyRole, setFamilyRole] = useState<'owner' | 'member' | null>(null);

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
        const [profileRes, shopRes] = await Promise.all([
          fetch('/api/user-profile'),
          fetch('/api/shop'),
        ]);
        if (!profileRes.ok) {
          throw new Error(`Failed to load profile: ${profileRes.status}`);
        }
        const data = await profileRes.json();

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
        if (shopRes.ok) {
          const shopData = await shopRes.json();
          setInventory(shopData.inventory || []);
        }

        // Fetch family role for the settings row badge
        try {
          const subRes = await fetch('/api/check-subscription');
          if (subRes.ok) {
            const subData = await subRes.json();
            setFamilyRole(subData.familyRole ?? null);
          }
        } catch {
          // ignore — badge is cosmetic
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
    if (hasUnsavedSchedule) {
      setShowScheduleWarning(true);
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex gap-2">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] px-4 sm:px-6 py-4 sticky top-0 z-50 safe-top">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="pressable p-2 -ml-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-neutral-900 dark:text-white">
            {language === 'ko' ? '학습 프로필 설정' : 'Learning Profile'}
          </h1>
          <div className="w-8" />
        </div>
      </header>

      <main id="main-content" className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-8 motion-safe:animate-fade-up">

        {/* ── Account hero card ─────────────────────────────────────────────── */}
        {session?.user && (
          <Card variant="default" padding="md" className="flex items-center gap-4">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="w-14 h-14 rounded-full ring-2 ring-violet-500/20 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-gradient flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 dark:text-white truncate">{session.user.name}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{session.user.email}</p>
            </div>
          </Card>
        )}

        {/* ── Notice banner ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-card">
          <svg className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-sky-800 dark:text-sky-300">
            {language === 'ko'
              ? '개인화된 맞춤 학습을 위해 계정당 하나의 프로필만 지원합니다.'
              : 'Only one profile per account is supported for personalized learning.'}
          </p>
        </div>

        {/* ── Profile Type Section ──────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
              {language === 'ko' ? '나는 어떤 사람인가요?' : 'What describes you best?'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {language === 'ko'
                ? '선택하신 유형에 맞는 어휘와 상황을 우선 학습합니다.'
                : 'We\'ll prioritize vocabulary and scenarios relevant to you.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profileTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`pressable relative p-4 rounded-card border-2 transition-all text-left ${
                  selectedType === type.id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-card dark:shadow-card-dark'
                    : 'border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-neutral-300 dark:hover:border-white/[0.12]'
                }`}
              >
                {selectedType === type.id && (
                  <span aria-hidden="true" className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center motion-safe:animate-ds-scale-in">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                  {language === 'ko' ? type.labelKo : type.labelEn}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 block leading-snug">
                  {language === 'ko' ? type.descKo : type.descEn}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Interests Section ─────────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
              {language === 'ko' ? '관심사 선택' : 'Select Your Interests'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {language === 'ko'
                ? '대화 주제를 맞춤화하는 데 사용됩니다. (복수 선택 가능)'
                : 'Used to personalize conversation topics. (Select multiple)'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {interestOptions.map(interest => (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`pressable px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedInterests.includes(interest.id)
                    ? 'bg-brand-gradient text-white shadow-glow-sm'
                    : 'bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 hover:border-violet-300 dark:hover:border-violet-500/40'
                }`}
              >
                {language === 'ko' ? interest.labelKo : interest.labelEn}
              </button>
            ))}
          </div>
        </section>

        {/* ── Custom Context Section ────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
              {language === 'ko' ? '추가 정보 (선택)' : 'Additional Context (Optional)'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {language === 'ko'
                ? '더 구체적인 상황이나 목표가 있다면 알려주세요.'
                : 'Tell us about specific situations or goals you have.'}
            </p>
          </div>

          <textarea
            value={customContext}
            onChange={e => setCustomContext(e.target.value)}
            placeholder={
              language === 'ko'
                ? '예: 미국 회사와 협업 중이며, 화상 회의를 자주 합니다.'
                : 'e.g., I work with US clients and have frequent video calls.'
            }
            className="w-full p-4 rounded-card border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none transition-colors"
            rows={3}
          />
        </section>

        {/* ── Difficulty Preference ─────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
              {language === 'ko' ? '학습 난이도' : 'Learning Difficulty'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {language === 'ko'
                ? '교정과 피드백의 난이도를 설정합니다.'
                : 'Set the difficulty level for corrections and feedback.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'easy', labelEn: 'Easy', labelKo: '쉬움', descEn: 'Simple corrections', descKo: '기본 교정' },
              { id: 'medium', labelEn: 'Medium', labelKo: '보통', descEn: 'Balanced', descKo: '균형 잡힘' },
              { id: 'hard', labelEn: 'Hard', labelKo: '어려움', descEn: 'Advanced', descKo: '고급 교정' },
              { id: 'adaptive', labelEn: 'Adaptive', labelKo: '자동 조절', descEn: 'Auto-adjusts', descKo: '자동 조절' },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setDifficultyPreference(option.id)}
                className={`pressable relative p-4 rounded-card border-2 transition-all text-left ${
                  difficultyPreference === option.id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-card dark:shadow-card-dark'
                    : 'border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-neutral-300 dark:hover:border-white/[0.12]'
                }`}
              >
                <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                  {language === 'ko' ? option.labelKo : option.labelEn}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 block">
                  {language === 'ko' ? option.descKo : option.descEn}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Correction Level ──────────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
              {language === 'ko' ? '교정 방식' : 'Correction Style'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {language === 'ko'
                ? '대화 중 교정의 강도를 설정합니다.'
                : 'Set how actively the tutor corrects your speech.'}
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { level: 1, labelEn: 'Just Chat', labelKo: '편하게 대화', descEn: 'No corrections — just natural conversation', descKo: '교정 없이 편하게 대화만' },
              { level: 2, labelEn: 'Gentle Echo', labelKo: '살짝 알려줘', descEn: 'Tutor naturally echoes the correct form', descKo: '올바른 표현을 자연스럽게 반복' },
              { level: 3, labelEn: 'Soft Coach', labelKo: '부드럽게 코칭', descEn: 'Gentle tips during conversation', descKo: '대화 중 부드러운 팁 제공' },
              { level: 4, labelEn: 'Active Teach', labelKo: '적극 교정', descEn: 'Direct corrections with explanations', descKo: '직접적인 교정과 설명' },
            ].map(option => (
              <button
                key={option.level}
                onClick={() => setCorrectionLevel(option.level)}
                className={`pressable w-full p-4 rounded-card border-2 transition-all text-left flex items-center gap-3 ${
                  correctionLevel === option.level
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-card dark:shadow-card-dark'
                    : 'border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-neutral-300 dark:hover:border-white/[0.12]'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                  correctionLevel === option.level
                    ? 'bg-brand-gradient text-white'
                    : 'bg-neutral-100 dark:bg-white/[0.07] text-neutral-500 dark:text-neutral-400'
                }`}>
                  {option.level}
                </span>
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
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

        {/* ── Schedule Settings ─────────────────────────────────────────────── */}
        <div data-schedule-section className="p-5 bg-white dark:bg-white/[0.03] rounded-card-lg border border-neutral-200 dark:border-white/[0.06]">
          <ScheduleSettings
            language={language as 'ko' | 'en'}
            initialSchedule={schedule}
            onSave={handleScheduleSave}
            onDirtyChange={setHasUnsavedSchedule}
          />
        </div>

        {/* ── Unsaved schedule warning ──────────────────────────────────────── */}
        {showScheduleWarning && (
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-card motion-safe:animate-fade-up">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {language === 'ko'
                ? '알림 스케줄이 아직 저장되지 않았습니다. 위의 "알림 설정 저장" 버튼을 먼저 눌러주세요.'
                : 'Schedule changes are not saved yet. Please click "Save Schedule" above first.'}
            </p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  setShowScheduleWarning(false);
                  document.querySelector('[data-schedule-section]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="pressable flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors"
              >
                {language === 'ko' ? '스케줄 저장하러 가기' : 'Go Save Schedule'}
              </button>
              <button
                onClick={() => {
                  setShowScheduleWarning(false);
                  saveProfile();
                }}
                className="pressable flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {language === 'ko' ? '프로필만 저장' : 'Save Profile Only'}
              </button>
            </div>
          </div>
        )}

        {/* ── Save Button ───────────────────────────────────────────────────── */}
        <div className="pt-2 pb-6">
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedType}
            className="pressable w-full btn-primary py-4 text-base rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? (language === 'ko' ? '저장 중...' : 'Saving...')
              : (language === 'ko' ? '프로필 저장' : 'Save Profile')}
          </button>

          {!selectedType && (
            <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 mt-3">
              {language === 'ko' ? '프로필 유형을 선택해주세요.' : 'Please select a profile type.'}
            </p>
          )}
        </div>

        {/* ── Inventory Section ─────────────────────────────────────────────── */}
        {inventory.length > 0 && (
          <section className="border-t border-neutral-200 dark:border-white/[0.06] pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                {language === 'ko' ? '내 아이템' : 'My Items'}
              </h2>
              <a
                href="/shop"
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
              >
                {language === 'ko' ? '상점 가기' : 'Go to Shop'}
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {inventory.map(inv => {
                const item = SHOP_ITEMS.find(s => s.id === inv.itemId);
                if (!item) return null;
                return (
                  <div key={inv.itemId} className="flex items-center gap-3 p-3 bg-white dark:bg-white/[0.04] rounded-card border border-neutral-200 dark:border-white/[0.06]">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        {language === 'ko' ? item.name.ko : item.name.en}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">x{inv.quantity}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Account Section ───────────────────────────────────────────────── */}
        <section className="border-t border-neutral-200 dark:border-white/[0.06] pt-6 space-y-2.5">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">
            {language === 'ko' ? '계정' : 'Account'}
          </h2>

          {/* Family Plan */}
          <button
            onClick={() => router.push('/family')}
            className="pressable w-full flex items-center gap-3 p-4 rounded-card bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] hover:bg-neutral-50 dark:hover:bg-white/[0.06] transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                  {language === 'ko' ? '가족 플랜' : 'Family Plan'}
                </span>
                {familyRole === 'owner' && (
                  <Badge variant="info" size="sm">운영 중</Badge>
                )}
                {familyRole === 'member' && (
                  <Badge variant="success" size="sm">참여 중</Badge>
                )}
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                {language === 'ko' ? '가족 구성원 관리 및 학습 현황' : 'Manage family members and learning progress'}
              </span>
            </div>
            <ChevronRight />
          </button>

          {/* Admin Dashboard */}
          {isAdmin && (
            <button
              onClick={() => router.push('/admin/users')}
              className="pressable w-full flex items-center gap-3 p-4 rounded-card bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] hover:bg-neutral-50 dark:hover:bg-white/[0.06] transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                  {language === 'ko' ? '관리자 대시보드' : 'Admin Dashboard'}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                  {language === 'ko' ? '사용자 관리, 구독 승인' : 'User management, subscription approval'}
                </span>
              </div>
              <ChevronRight />
            </button>
          )}

          {/* Switch Account */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="pressable w-full flex items-center gap-3 p-4 rounded-card bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] hover:bg-neutral-50 dark:hover:bg-white/[0.06] transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                {language === 'ko' ? '계정 전환' : 'Switch Account'}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                {language === 'ko' ? '로그아웃 후 다른 계정으로 로그인' : 'Sign out and log in with another account'}
              </span>
            </div>
            <ChevronRight />
          </button>

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="pressable w-full flex items-center gap-3 p-4 rounded-card bg-white dark:bg-white/[0.03] border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            <span className="font-semibold text-red-600 dark:text-red-400 text-sm flex-1">
              {language === 'ko' ? '로그아웃' : 'Sign Out'}
            </span>
          </button>

          {/* ── Danger Zone ───────────────────────────────────────────────────── */}
          <div className="mt-2 pt-2 border-t border-red-100 dark:border-red-500/10">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="pressable w-full flex items-center gap-3 p-4 rounded-card bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.05] hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/20 transition-all text-left"
            >
              <span className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400 block text-sm">
                  {language === 'ko' ? '계정 삭제' : 'Delete Account'}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 block">
                  {language === 'ko' ? '모든 데이터가 영구적으로 삭제됩니다' : 'All data will be permanently deleted'}
                </span>
              </div>
              <ChevronRight />
            </button>
          </div>
        </section>

        {/* ── Delete Account Confirmation Modal ─────────────────────────────── */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-card-lg p-6 max-w-sm w-full shadow-float dark:shadow-float-dark border border-neutral-200 dark:border-white/[0.08] motion-safe:animate-ds-scale-in">
              <div className="flex justify-center mb-4">
                <span className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white text-center mb-2">
                {language === 'ko' ? '정말 계정을 삭제하시겠습니까?' : 'Delete your account?'}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6 leading-relaxed">
                {language === 'ko'
                  ? '학습 기록, 교정 내역, 단어장 등 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.'
                  : 'All your learning records, corrections, vocabulary, and other data will be permanently deleted and cannot be recovered.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="pressable flex-1 py-3 rounded-xl border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                >
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      const res = await fetch('/api/account/delete', { method: 'DELETE' });
                      const data = await res.json();
                      if (data.success) {
                        await signOut({ callbackUrl: '/login' });
                      } else {
                        alert(language === 'ko' ? '계정 삭제에 실패했습니다.' : 'Failed to delete account.');
                        setShowDeleteConfirm(false);
                      }
                    } catch {
                      alert(language === 'ko' ? '계정 삭제에 실패했습니다.' : 'Failed to delete account.');
                      setShowDeleteConfirm(false);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className="pressable flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting
                    ? (language === 'ko' ? '삭제 중...' : 'Deleting...')
                    : (language === 'ko' ? '계정 삭제' : 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom nav spacer */}
      <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      <BottomNav />
    </div>
  );
}
