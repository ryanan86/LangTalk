'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EXAM_FORMS } from '@/data/examForms';
import { Card, Badge, ProgressBar, Skeleton } from '@/components/ui';
import BottomNav from '@/components/BottomNav';
import type { ExamType, ExamGradeResult } from '@/lib/examTypes';

// ─── Grade color helpers ───────────────────────────────────────────────────────
function gradeVariant(grade: string): 'success' | 'warning' | 'info' | 'default' {
  // OPIc: AL, IH = success; IM = warning; IL, NH = info
  if (['AL', 'IH', 'Level 7', 'Level 8'].some((g) => grade.includes(g))) return 'success';
  if (['IM', 'Level 5', 'Level 6'].some((g) => grade.includes(g))) return 'warning';
  if (['IL', 'NH', 'Level 3', 'Level 4'].some((g) => grade.includes(g))) return 'info';
  return 'default';
}

// ─── Subscore label map ────────────────────────────────────────────────────────
const SUBSCORE_LABELS: Record<string, string> = {
  fluency: '유창성',
  grammar: '문법',
  vocabulary: '어휘',
  coherence: '응집력',
  taskCompletion: '과제 완성도',
};

// ─── Exam type config ──────────────────────────────────────────────────────────
const EXAM_CONFIG: Record<ExamType, { titleKo: string; descKo: string; color: string; gradientFrom: string; gradientTo: string }> = {
  'toeic-speaking': {
    titleKo: '토익 스피킹 모의고사',
    descKo: '소리내어 읽기 · 질문 답변 · 의견 제시',
    color: 'text-violet-400',
    gradientFrom: 'from-violet-500/15',
    gradientTo: 'to-indigo-500/10',
  },
  'opic': {
    titleKo: '오픽 모의고사',
    descKo: '자기소개 · 주제 답변 · 역할극 · 돌발 질문',
    color: 'text-sky-400',
    gradientFrom: 'from-sky-500/15',
    gradientTo: 'to-blue-500/10',
  },
};

// ─── History item row ─────────────────────────────────────────────────────────
function HistoryItem({ item }: { item: ExamGradeResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EXAM_CONFIG[item.examType];
  const subscoreKeys = Object.keys(item.subscores) as (keyof typeof item.subscores)[];

  return (
    <button
      className="pressable text-left w-full rounded-2xl bg-white/[0.03] border border-white/[0.05] overflow-hidden"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} border border-white/[0.06] flex items-center justify-center shrink-0`}>
            <span className={`text-sm font-bold ${cfg.color}`}>{item.predictedGrade}</span>
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-neutral-200 truncate">
              {cfg.titleKo}
            </p>
            <p className="text-xs text-neutral-500">{item.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={gradeVariant(item.predictedGrade)} size="sm">{item.predictedGrade}</Badge>
          <svg
            className={`w-4 h-4 text-neutral-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/[0.04]">
          {subscoreKeys.map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">{SUBSCORE_LABELS[key] ?? key}</span>
                <span className="text-neutral-300 font-medium tabular-nums">{item.subscores[key]}</span>
              </div>
              <ProgressBar value={item.subscores[key]} variant="brand" size="sm" animated />
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Exam type card ────────────────────────────────────────────────────────────
function ExamTypeCard({
  examType,
  latestGrade,
  selectedFormId,
  onSelectForm,
  onStart,
}: {
  examType: ExamType;
  latestGrade?: string;
  selectedFormId: string;
  onSelectForm: (formId: string) => void;
  onStart: () => void;
}) {
  const cfg = EXAM_CONFIG[examType];
  const forms = EXAM_FORMS.filter((f) => f.examType === examType);

  return (
    <Card variant="default" padding="md" className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-100">{cfg.titleKo}</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{cfg.descKo}</p>
        </div>
        {latestGrade && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            <Badge variant={gradeVariant(latestGrade)} size="sm">{latestGrade}</Badge>
            <span className="text-2xs text-neutral-500">최근 예상 등급</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
          <p className="text-lg font-bold text-neutral-100">{forms[0]?.tasks.length ?? 6}</p>
          <p className="text-2xs text-neutral-500">문항</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
          <p className="text-lg font-bold text-neutral-100">{forms[0]?.totalMinutes ?? 12}</p>
          <p className="text-2xs text-neutral-500">분 소요</p>
        </div>
      </div>

      {/* Form picker */}
      {forms.length > 1 && (
        <div className="flex gap-2">
          {forms.map((f) => (
            <button
              key={f.formId}
              className={`pressable flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                selectedFormId === f.formId
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-neutral-200'
              }`}
              onClick={() => onSelectForm(f.formId)}
            >
              {f.formId.includes('1') ? 'Form 1' : 'Form 2'}
            </button>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        className="pressable w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/20 hover:opacity-90 transition-opacity"
        onClick={onStart}
      >
        시작
      </button>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ExamPage() {
  const router = useRouter();
  const [history, setHistory] = useState<ExamGradeResult[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [selectedForms, setSelectedForms] = useState<Record<ExamType, string>>({
    'toeic-speaking': EXAM_FORMS.find((f) => f.examType === 'toeic-speaking')?.formId ?? 'ts-form-1',
    'opic': EXAM_FORMS.find((f) => f.examType === 'opic')?.formId ?? 'op-form-1',
  });

  // Fetch history on mount
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/exam/history', { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setHistory(data.history ?? []);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setHistoryError(true);
        setHistory([]);
      });
    return () => controller.abort();
  }, []);

  const latestGrade = (examType: ExamType) =>
    history?.find((h) => h.examType === examType)?.predictedGrade;

  const handleStart = (examType: ExamType) => {
    const formId = selectedForms[examType];
    router.push(`/exam/session?examType=${examType}&formId=${formId}`);
  };

  return (
    <div
      className="min-h-screen bg-neutral-950 flex flex-col"
      style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
    >
      {/* Header */}
      <header
        className="px-4 py-4 flex items-center gap-3 border-b border-white/[0.05]"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <Link
          href="/"
          className="pressable p-2 rounded-xl text-neutral-400 hover:text-white transition-colors"
          aria-label="홈으로"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">시험 모드</h1>
          <p className="text-xs text-neutral-500">토스 · 오픽 예상 등급</p>
        </div>
      </header>

      <main id="main-content" className="flex-1 max-w-sm mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Exam cards */}
        <div className="flex flex-col gap-4">
          {(['toeic-speaking', 'opic'] as ExamType[]).map((examType) => (
            <ExamTypeCard
              key={examType}
              examType={examType}
              latestGrade={latestGrade(examType)}
              selectedFormId={selectedForms[examType]}
              onSelectForm={(formId) => setSelectedForms((prev) => ({ ...prev, [examType]: formId }))}
              onStart={() => handleStart(examType)}
            />
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-2xs text-neutral-600">
          예상 등급은 AI 참고용이며 실제 시험 주관사와 무관합니다.
        </p>

        {/* History section */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3">응시 기록</h2>

          {history === null ? (
            /* Loading skeleton */
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} shape="rect" height={64} className="w-full" />
              ))}
            </div>
          ) : historyError || history.length === 0 ? (
            /* Empty / error state */
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6 text-center">
              <svg className="w-10 h-10 text-neutral-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75a2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
              <p className="text-neutral-500 text-sm">
                {historyError ? '기록을 불러올 수 없어요.' : '아직 응시 기록이 없어요.'}
              </p>
              <p className="text-neutral-600 text-xs mt-1">위에서 시험을 시작해 보세요.</p>
            </div>
          ) : (
            /* History list */
            <div className="flex flex-col gap-2">
              {history.map((item, idx) => (
                <HistoryItem key={`${item.formId}-${item.date}-${idx}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
