'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EXAM_FORMS } from '@/data/examForms';
import { useExamVoice } from '@/hooks/useExamVoice';
import { Modal, Button, ProgressBar } from '@/components/ui';
import AiBadge from '@/components/ai/AiBadge';
import type {
  ExamForm,
  ExamTask,
  ExamAnswer,
  ExamGradeResult,
  ExamType,
} from '@/lib/examTypes';

// ─── Task type label map ───────────────────────────────────────────────────────
const TASK_TYPE_KO: Record<string, string> = {
  'read-aloud': '소리내어 읽기',
  'qa': '질문 답변',
  'opinion': '의견 제시',
  'self-intro': '자기소개',
  'roleplay': '역할극',
  'unexpected': '돌발 질문',
};

// ─── Grading messages ─────────────────────────────────────────────────────────
const GRADING_MESSAGES = [
  'AI가 답변을 분석하고 있어요...',
  '발음과 유창성을 평가하고 있어요...',
  '문법과 어휘를 검토하고 있어요...',
  '종합 피드백을 작성하고 있어요...',
  '예상 등급을 산출하고 있어요...',
];

// ─── Phase types ──────────────────────────────────────────────────────────────
type Phase =
  | 'intro'
  | 'intro-task'
  | 'prep'
  | 'answer'
  | 'transcribing'
  | 'grading'
  | 'result'
  | 'exit-confirm';

// ─── Sub-score label map ──────────────────────────────────────────────────────
const SUBSCORE_LABELS: Record<string, string> = {
  fluency: '유창성',
  grammar: '문법',
  vocabulary: '어휘',
  coherence: '응집력',
  taskCompletion: '과제 완성도',
};

// ─── Timer ring SVG ───────────────────────────────────────────────────────────
function TimerRing({ seconds, total, urgent }: { seconds: number; total: number; urgent: boolean }) {
  const R = 52;
  const circumference = 2 * Math.PI * R;
  const progress = total > 0 ? seconds / total : 0;
  const offset = circumference * (1 - progress);
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="motion-safe:transition-all">
      <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle
        cx="64"
        cy="64"
        r={R}
        fill="none"
        stroke={urgent ? '#ef4444' : '#7c3aed'}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
        className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear"
      />
      <text
        x="64"
        y="64"
        textAnchor="middle"
        dominantBaseline="central"
        fill={urgent ? '#ef4444' : 'white'}
        fontSize="28"
        fontWeight="700"
        fontFamily="'Inter', sans-serif"
      >
        {seconds}
      </text>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExamSessionRunner() {
  const router = useRouter();
  const params = useSearchParams();
  const formId = params.get('formId') ?? '';
  const examType = params.get('examType') as ExamType | null;

  // Resolve form
  const form: ExamForm | undefined = EXAM_FORMS.find((f) => f.formId === formId);

  const [taskIndex, setTaskIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [result, setResult] = useState<ExamGradeResult | null>(null);
  const [gradingMsgIndex, setGradingMsgIndex] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const answerStartTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const task: ExamTask | undefined = form?.tasks[taskIndex];

  // ─── Voice ────────────────────────────────────────────────────────────────
  const { isRecording, isProcessingSTT, startRecording, stopRecording } = useExamVoice({
    onTranscript: useCallback((transcript: string) => {
      setPendingTranscript(transcript);
    }, []),
  });

  // ─── Timer ────────────────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((seconds: number, onEnd: () => void) => {
    clearTimer();
    setTimerSeconds(seconds);
    let remaining = seconds;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimerSeconds(remaining);
      if (remaining <= 0) {
        clearTimer();
        onEnd();
      }
    }, 1000);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  // ─── Phase transitions ────────────────────────────────────────────────────
  const beginPrep = useCallback(() => {
    if (!task) return;
    setPhase('prep');
    if (task.prepSeconds > 0) {
      startTimer(task.prepSeconds, () => beginAnswer());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, startTimer]);

  const beginAnswer = useCallback(async () => {
    if (!task) return;
    clearTimer();
    setPhase('answer');
    answerStartTimeRef.current = Date.now();
    await startRecording();
    startTimer(task.answerSeconds, () => finishAnswer());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, clearTimer, startRecording, startTimer]);

  const finishAnswer = useCallback(async () => {
    clearTimer();
    stopRecording();
    setPhase('transcribing');
  }, [clearTimer, stopRecording]);

  // Watch for transcript to arrive after transcribing phase
  useEffect(() => {
    if (phase !== 'transcribing') return;
    if (isRecording || isProcessingSTT) return;

    // transcript (possibly empty) is ready — store and advance
    const elapsed = Math.round((Date.now() - answerStartTimeRef.current) / 1000);
    const words = pendingTranscript.trim().split(/\s+/).filter(Boolean).length;
    const answer: ExamAnswer = {
      taskId: task?.id ?? '',
      transcript: pendingTranscript.trim(),
      answerSeconds: elapsed,
      wordsSpoken: words,
    };

    setAnswers((prev) => {
      const next = [...prev, answer];

      // If last task → go to grading
      if (form && taskIndex >= form.tasks.length - 1) {
        submitForGrading(next);
      } else {
        // Advance to next task with fade
        setTaskIndex((i) => i + 1);
        setPhase('intro-task'); // brief fade moment before prep
        setTimeout(() => {
          beginPrep();
        }, 400);
      }
      return next;
    });

    setPendingTranscript('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isRecording, isProcessingSTT]);

  // ─── Grading ─────────────────────────────────────────────────────────────
  const submitForGrading = useCallback(async (finalAnswers: ExamAnswer[]) => {
    setPhase('grading');
    setGradingMsgIndex(0);

    // Cycle grading messages
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % GRADING_MESSAGES.length;
      setGradingMsgIndex(msgIdx);
    }, 2200);

    try {
      const res = await fetch('/api/exam/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType: form?.examType,
          formId: form?.formId,
          answers: finalAnswers,
        }),
      });

      clearInterval(msgInterval);

      if (!res.ok) {
        setRetryError(true);
        setPhase('result');
        return;
      }

      const data = await res.json();
      setResult(data.result);
      setPhase('result');
    } catch {
      clearInterval(msgInterval);
      setRetryError(true);
      setPhase('result');
    }
  }, [form]);

  // ─── Early error state ────────────────────────────────────────────────────
  if (!form || !examType) {
    return (
      <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-white text-lg font-semibold">시험 정보를 불러올 수 없어요.</p>
        <Button variant="secondary" onClick={() => router.push('/exam')}>돌아가기</Button>
      </div>
    );
  }

  const totalTasks = form.tasks.length;
  const progressPct = ((taskIndex) / totalTasks) * 100;

  // ─── INTRO SCREEN ─────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center p-6 safe-all" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <div className="w-full max-w-sm flex flex-col gap-6 motion-safe:animate-fade-up">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75a2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">{form.titleKo}</h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              실제 시험처럼 진행됩니다. 문항당 1회만 답변할 수 있어요.
            </p>
          </div>

          {/* Exam info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 text-center">
              <p className="text-2xl font-bold text-white">{totalTasks}</p>
              <p className="text-xs text-neutral-400 mt-0.5">문항</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 text-center">
              <p className="text-2xl font-bold text-white">{form.totalMinutes}</p>
              <p className="text-xs text-neutral-400 mt-0.5">분 소요</p>
            </div>
          </div>

          {/* Mic reminder */}
          <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <p className="text-amber-300 text-sm">마이크가 잘 작동하는지 확인하세요.</p>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <Button
              size="lg"
              fullWidth
              onClick={beginPrep}
              className="bg-gradient-to-r from-violet-600 to-indigo-500 border-0"
            >
              시험 시작
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => router.push('/exam')}
              className="text-neutral-400"
            >
              취소
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── GRADING SCREEN ───────────────────────────────────────────────────────
  if (phase === 'grading') {
    return (
      <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-8 p-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg mb-1">AI 채점 중</p>
          <p className="text-neutral-400 text-sm motion-safe:animate-fade-up" key={gradingMsgIndex}>
            {GRADING_MESSAGES[gradingMsgIndex]}
          </p>
        </div>
      </div>
    );
  }

  // ─── RESULT SCREEN ────────────────────────────────────────────────────────
  if (phase === 'result') {
    // 502 / network error state
    if (retryError || !result) {
      return (
        <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-lg mb-1">채점에 실패했어요</p>
            <p className="text-neutral-400 text-sm">AI 서버에 일시적인 문제가 있어요. 답변은 저장되어 있으니 다시 시도해 주세요.</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button
              size="lg"
              fullWidth
              onClick={() => {
                setRetryError(false);
                submitForGrading(answers);
              }}
            >
              다시 채점 요청
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={() => router.push('/exam')} className="text-neutral-400">
              시험 목록으로
            </Button>
          </div>
        </div>
      );
    }

    const subscores = result.subscores;
    const subscoreKeys = Object.keys(subscores) as (keyof typeof subscores)[];

    return (
      <div
        className="min-h-screen bg-neutral-950 flex flex-col"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-sm mx-auto w-full px-4 flex flex-col gap-6 py-6">
          {/* Grade hero */}
          <div className="text-center report-fade-up report-fade-up-1">
            <p className="text-neutral-400 text-sm mb-4">
              {result.examType === 'toeic-speaking' ? '토익 스피킹 모의고사' : '오픽 모의고사'} 결과
            </p>
            <div className="inline-flex flex-col items-center gap-1">
              <div className="motion-safe:animate-gentle-bounce">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border-2 border-violet-500/40 flex items-center justify-center shadow-float-dark">
                  <div>
                    <p className="text-display-1 text-white leading-none text-center">{result.predictedGrade}</p>
                    {result.predictedScoreRange && (
                      <p className="text-xs text-violet-300 text-center mt-1">{result.predictedScoreRange}점</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <p className="text-neutral-400 text-xs">예상 등급 (AI 참고용)</p>
                <AiBadge variant="violet" />
              </div>
            </div>
          </div>

          {/* Subscores */}
          <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-5 flex flex-col gap-4 report-fade-up report-fade-up-2">
            <p className="text-sm font-semibold text-white">세부 점수</p>
            {subscoreKeys.map((key) => (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">{SUBSCORE_LABELS[key] ?? key}</span>
                  <span className="text-white font-semibold tabular-nums">{subscores[key]}</span>
                </div>
                <ProgressBar value={subscores[key]} variant="brand" size="sm" animated />
              </div>
            ))}
          </div>

          {/* Overall feedback */}
          <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-5 report-fade-up report-fade-up-3">
            <p className="text-sm font-semibold text-white mb-3">종합 피드백</p>
            <p className="text-neutral-300 text-sm leading-relaxed">{result.overallFeedbackKo}</p>
          </div>

          {/* Per-task accordion */}
          <div className="flex flex-col gap-2 report-fade-up report-fade-up-4">
            <p className="text-sm font-semibold text-white px-1">문항별 피드백</p>
            {result.perTaskFeedback.map((tf, idx) => {
              const t = form.tasks.find((t) => t.id === tf.taskId);
              const isOpen = expandedTaskId === tf.taskId;
              return (
                <button
                  key={tf.taskId}
                  className="pressable text-left rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden w-full"
                  onClick={() => setExpandedTaskId(isOpen ? null : tf.taskId)}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-violet-500/15 text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-neutral-300 font-medium">{t ? TASK_TYPE_KO[t.type] : '문항'}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                    </svg>
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/[0.04]">
                      {/* Transcript */}
                      <div className="pt-3">
                        <p className="text-2xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">내 답변</p>
                        <p className="text-neutral-400 text-sm leading-relaxed">
                          {answers.find((a) => a.taskId === tf.taskId)?.transcript || '(인식된 텍스트 없음)'}
                        </p>
                      </div>
                      {/* Feedback */}
                      <div>
                        <p className="text-2xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">피드백</p>
                        <p className="text-neutral-300 text-sm leading-relaxed">{tf.feedbackKo}</p>
                      </div>
                      {/* Strong / Weak */}
                      {(tf.strong || tf.weak) && (
                        <div className="grid grid-cols-2 gap-2">
                          {tf.strong && (
                            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                              <p className="text-2xs text-emerald-400 font-semibold mb-1">잘한 점</p>
                              <p className="text-emerald-300 text-xs leading-relaxed">{tf.strong}</p>
                            </div>
                          )}
                          {tf.weak && (
                            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                              <p className="text-2xs text-amber-400 font-semibold mb-1">개선할 점</p>
                              <p className="text-amber-300 text-xs leading-relaxed">{tf.weak}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-2xs text-neutral-600 px-4">
            예상 등급은 AI 참고용이며 실제 시험 주관사와 무관합니다.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-2 pb-2">
            <Button size="lg" fullWidth onClick={() => router.push('/exam')}>
              기록 보기
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => router.push(`/exam/session?examType=${form.examType}&formId=${form.formId}`)}
            >
              다시 응시
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── TASK SCREENS (prep / answer / transcribing) ───────────────────────────
  if (!task) return null;

  const isPrepPhase = phase === 'prep';
  const isAnswerPhase = phase === 'answer';
  const isTranscribing = phase === 'transcribing';
  const totalTimer = isPrepPhase ? task.prepSeconds : task.answerSeconds;
  const isUrgent = isAnswerPhase && timerSeconds <= 10;

  return (
    <div
      className="fixed inset-0 bg-neutral-950 flex flex-col"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          className="pressable p-2 rounded-xl text-neutral-400 hover:text-white transition-colors"
          onClick={() => setShowExitConfirm(true)}
          aria-label="나가기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex-1 px-4">
          <ProgressBar value={progressPct} variant="brand" size="sm" animated={false} />
        </div>
        <span className="text-xs text-neutral-500 tabular-nums whitespace-nowrap">
          {taskIndex + 1}/{totalTasks}
        </span>
      </div>

      {/* Main task body */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-4 overflow-hidden">
        {/* Task header */}
        <div className="w-full max-w-sm text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-300 text-xs font-semibold mb-3">
            {TASK_TYPE_KO[task.type] ?? task.type}
          </span>
          <p className="text-neutral-400 text-sm leading-relaxed">{task.promptKo}</p>
        </div>

        {/* Prompt content */}
        <div className="w-full max-w-sm flex-1 flex items-center justify-center py-4">
          <div
            className={`w-full rounded-3xl p-5 ${
              task.type === 'read-aloud'
                ? 'bg-white/[0.06] border border-white/[0.08]'
                : 'bg-white/[0.03] border border-white/[0.05]'
            }`}
          >
            <p
              className={`leading-relaxed text-center ${
                task.type === 'read-aloud'
                  ? 'text-white text-base font-medium'
                  : 'text-neutral-200 text-sm'
              }`}
            >
              {task.promptEn}
            </p>
          </div>
        </div>

        {/* Phase indicator and timer */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {isTranscribing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-neutral-400 text-sm">답변 분석 중...</p>
            </div>
          ) : (
            <>
              {/* Phase label */}
              <p className={`text-sm font-semibold ${isPrepPhase ? 'text-amber-400' : 'text-violet-400'}`}>
                {isPrepPhase ? '준비 시간' : '답변 시간'}
              </p>

              {/* Timer ring */}
              {totalTimer > 0 && (
                <TimerRing seconds={timerSeconds} total={totalTimer} urgent={isUrgent} />
              )}

              {/* Recording indicator */}
              {isAnswerPhase && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-sm font-medium">녹음 중</span>
                </div>
              )}

              {/* Voice wave bars */}
              {isAnswerPhase && (
                <div className="flex items-end gap-1 h-8">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="voice-bar" />
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 w-full">
                {isPrepPhase && task.prepSeconds > 0 && (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={beginAnswer}
                  >
                    바로 답변
                  </Button>
                )}
                {isAnswerPhase && (
                  <Button
                    variant="danger"
                    size="md"
                    fullWidth
                    onClick={finishAnswer}
                  >
                    답변 완료
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Exit confirm modal */}
      <Modal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="시험을 그만두시겠어요?"
        actions={
          <>
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={() => router.push('/exam')}
            >
              종료 (진행 취소)
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => setShowExitConfirm(false)}
            >
              계속하기
            </Button>
          </>
        }
      >
        지금 나가면 진행 중인 답변이 모두 취소됩니다.
      </Modal>
    </div>
  );
}
