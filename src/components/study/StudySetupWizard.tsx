'use client';

import { useState, useEffect, useRef } from 'react';
import type { StudyProfile, StudyGoal, StudyPlan } from '@/lib/studyTypes';
import { cefrToSelfLevel } from '@/lib/studyTypes';
import { track } from '@/lib/analytics';
import {
  STUDY_GOALS,
  LEVEL_META,
  DAILY_MINUTES_OPTIONS,
  PLAN_GENERATION_MESSAGES,
  localDateString,
} from '@/lib/studyClient';

interface StudySetupWizardProps {
  /** interests from the user's existing profile, forwarded to plan generation. */
  interests?: string[];
  /** CEFR grade from prior talk-session analysis, used to pre-select the level step. */
  assessedCEFR?: string | null;
  onComplete: (plan: StudyPlan) => void;
  onCancel: () => void;
}

type WizardStep = 0 | 1 | 2 | 3;

const STEP_TITLES = ['목표 선택', '현재 수준', '하루 학습 시간', '주 학습일'];

export default function StudySetupWizard({ interests, assessedCEFR, onComplete, onCancel }: StudySetupWizardProps) {
  const [step, setStep] = useState<WizardStep>(0);

  // Recommended level derived from prior conversation analysis (may be null).
  const recommendedLevel = cefrToSelfLevel(assessedCEFR);

  // Wizard answers
  const [goal, setGoal] = useState<StudyGoal | null>(null);
  const [goalDetail, setGoalDetail] = useState('');
  const [selfLevel, setSelfLevel] = useState<StudyProfile['selfLevel'] | null>(recommendedLevel);
  const [dailyMinutes, setDailyMinutes] = useState<StudyProfile['dailyMinutes'] | null>(null);
  const [studyDaysPerWeek, setStudyDaysPerWeek] = useState<number>(5);

  // Pre-select the recommended level once it becomes available (async load),
  // but never override a choice the user has already made.
  useEffect(() => {
    if (recommendedLevel && selfLevel === null) setSelfLevel(recommendedLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendedLevel]);

  // Plan generation state
  const [generating, setGenerating] = useState(false);
  const [genMessageIndex, setGenMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const genTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cycle progressive status messages during generation
  useEffect(() => {
    if (!generating) return;
    genTimerRef.current = setInterval(() => {
      setGenMessageIndex((i) => Math.min(i + 1, PLAN_GENERATION_MESSAGES.length - 1));
    }, 1800);
    return () => {
      if (genTimerRef.current) clearInterval(genTimerRef.current);
    };
  }, [generating]);

  const canProceed =
    (step === 0 && goal !== null) ||
    (step === 1 && selfLevel !== null) ||
    (step === 2 && dailyMinutes !== null) ||
    step === 3;

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as WizardStep);
    else handleGenerate();
  };

  const handleBack = () => {
    if (step === 0) onCancel();
    else setStep((s) => (s - 1) as WizardStep);
  };

  const handleGenerate = async () => {
    if (!goal || !selfLevel || !dailyMinutes) return;
    setError(null);
    setGenerating(true);
    setGenMessageIndex(0);

    const profile: StudyProfile = {
      goal,
      goalDetail: goalDetail.trim() || undefined,
      selfLevel,
      assessedCEFR: assessedCEFR ?? undefined,
      dailyMinutes,
      studyDaysPerWeek,
      startDate: localDateString(),
    };

    try {
      const res = await fetch('/api/study/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, interests }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.plan) throw new Error('플랜 데이터가 비어 있습니다');
      track('study_plan_created', { goal, selfLevel, dailyMinutes, studyDaysPerWeek });
      onComplete(data.plan as StudyPlan);
    } catch (e) {
      console.error('Plan generation failed:', e);
      setError('플랜 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
      setGenerating(false);
    }
  };

  // ---------- Generating (loading) screen ----------
  if (generating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full border-4 border-primary-200 dark:border-primary-500/20 border-t-primary-500 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
          12주 플랜을 만들고 있어요
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 min-h-[1.5rem] transition-all">
          {PLAN_GENERATION_MESSAGES[genMessageIndex]}
        </p>
        <div className="mt-6 flex gap-1.5">
          {PLAN_GENERATION_MESSAGES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${
                i <= genMessageIndex ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress header */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-1.5 mb-3">
            {STEP_TITLES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
            {step + 1} / 4 · {STEP_TITLES[step]}
          </p>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 sm:px-6 pb-4 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {step === 0 && (
            <div className="motion-safe:animate-fade-in">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                어떤 목표로 배우시나요?
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                목표에 맞춰 12주 커리큘럼을 설계해드려요.
              </p>
              <div className="grid gap-3">
                {STUDY_GOALS.map((g) => {
                  const selected = goal === g.goal;
                  return (
                    <button
                      key={g.goal}
                      onClick={() => setGoal(g.goal)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${
                        selected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-dark-surface hover:border-primary-300 dark:hover:border-primary-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-semibold ${selected ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-white'}`}>
                            {g.title}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{g.description}</p>
                        </div>
                        {selected && (
                          <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {goal && (
                <div className="mt-4 motion-safe:animate-fade-in">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    구체적인 상황 (선택)
                  </label>
                  <input
                    type="text"
                    value={goalDetail}
                    onChange={(e) => setGoalDetail(e.target.value)}
                    maxLength={80}
                    placeholder={STUDY_GOALS.find((g) => g.goal === goal)?.detailPlaceholder}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-surface text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                  />
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="motion-safe:animate-fade-in">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                현재 영어 수준은?
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                솔직하게 골라주세요. 첫 대화로 자동 보정돼요.
              </p>
              <div className="grid gap-3">
                {LEVEL_META.map((l) => {
                  const selected = selfLevel === l.value;
                  const recommended = recommendedLevel === l.value;
                  return (
                    <button
                      key={l.value}
                      onClick={() => setSelfLevel(l.value)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${
                        selected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-dark-surface hover:border-primary-300 dark:hover:border-primary-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold ${selected ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-white'}`}>
                          {l.title}
                        </p>
                        {recommended && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400">
                            기존 대화 분석 기반 추천 레벨
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{l.description}</p>
                    </button>
                  );
                })}
              </div>
              {recommendedLevel && (
                <p className="mt-3 text-xs text-primary-600 dark:text-primary-400">
                  기존 대화 분석 기반 추천 레벨이 미리 선택되어 있어요. 원하면 직접 바꿀 수 있어요.
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="motion-safe:animate-fade-in">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                하루에 얼마나 학습할까요?
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                시간에 맞춰 블록 구성이 자동 조절돼요.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DAILY_MINUTES_OPTIONS.map((o) => {
                  const selected = dailyMinutes === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setDailyMinutes(o.value)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${
                        selected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-dark-surface hover:border-primary-300 dark:hover:border-primary-500/40'
                      }`}
                    >
                      <p className={`text-lg font-bold ${selected ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-white'}`}>
                        {o.title}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{o.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="motion-safe:animate-fade-in">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                일주일에 며칠 학습할까요?
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                꾸준함이 실력을 만들어요. 무리하지 않는 선에서 골라주세요.
              </p>

              <div className="p-5 rounded-2xl border-2 border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-center mb-5">
                <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                  {studyDaysPerWeek}
                  <span className="text-lg font-medium text-primary-500/70 dark:text-primary-400/70 ml-1">일 / 주</span>
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[3, 4, 5, 6, 7].map((d) => {
                  const selected = studyDaysPerWeek === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setStudyDaysPerWeek(d)}
                      className={`py-3 rounded-xl font-semibold transition-all ${
                        selected
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                          : 'bg-white dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-primary-300'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  내 학습 플랜
                </p>
                <ul className="space-y-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                  <li className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">목표</span>
                    <span className="font-medium">{STUDY_GOALS.find((g) => g.goal === goal)?.title}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">수준</span>
                    <span className="font-medium">{LEVEL_META.find((l) => l.value === selfLevel)?.title}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">하루 학습</span>
                    <span className="font-medium">{dailyMinutes}분</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">주 학습일</span>
                    <span className="font-medium">{studyDaysPerWeek}일</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div
        className="px-4 sm:px-6 py-4 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-t border-neutral-100 dark:border-neutral-800"
        style={{ paddingBottom: 'max(1rem, calc(0.5rem + env(safe-area-inset-bottom)))' }}
      >
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={handleBack}
            className="px-5 py-3 rounded-xl font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            {step === 0 ? '취소' : '이전'}
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="flex-1 btn-primary py-3 disabled:opacity-40"
          >
            {step === 3 ? '12주 플랜 생성' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
