'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { personas } from '@/lib/personas';
import { STUDY_PATTERNS } from '@/data/studyPatterns';
import { CORE_VOCAB } from '@/data/coreVocab';
import { scoreShadowing } from '@/lib/shadowing';
import type {
  StudyPlan,
  StudyStats,
  StudyBlockType,
  StudyBlockSpec,
  StudyDayResult,
  GrammarPattern,
  CoreVocabItem,
} from '@/lib/studyTypes';
import { buildBlockSequence } from '@/lib/studyTypes';
import {
  positionFromState,
  selectDailyVocab,
  selectDailyPatterns,
  buildShadowingSentences,
  transcriptContainsWord,
  weeklyTestScore,
  dayXP,
  localDateString,
  CONVERSATION_BLOCKS,
} from '@/lib/studyClient';
import { useStudyVoice, type StudyChatContext, type StudyMessage } from '@/hooks/useStudyVoice';

interface StudySessionPlayerProps {
  plan: StudyPlan;
  stats: StudyStats | null;
  tutorId?: string;
  onExit: () => void;
  /** Called after the day result is saved, with updated stats (dashboard refresh). */
  onCompleted: (updatedStats: StudyStats) => void;
}

// Mutable counters accumulated across the whole session.
interface SessionCounters {
  spokenSentences: number;
  newWordsLearned: number;
  shadowingScores: number[];
  startedAt: number;
}

export default function StudySessionPlayer({ plan, stats, tutorId = 'emma', onExit, onCompleted }: StudySessionPlayerProps) {
  const persona = personas[tutorId] ?? personas.emma;
  const voice = useStudyVoice({ voice: persona.voice, tutorId });

  const pos = useMemo(() => positionFromState(plan, stats), [plan, stats]);
  const week = plan.weeks.find((w) => w.week === pos.week) ?? plan.weeks[0];
  const isWeeklyTestDay = pos.day === plan.profile.studyDaysPerWeek;
  const dayIndexAbsolute = (pos.week - 1) * plan.profile.studyDaysPerWeek + (pos.day - 1);

  const blocks = useMemo<StudyBlockSpec[]>(() => buildBlockSequence(plan.profile.dailyMinutes), [plan.profile.dailyMinutes]);

  // Deterministic daily content.
  const todayPatterns = useMemo<GrammarPattern[]>(
    () => selectDailyPatterns(STUDY_PATTERNS, week?.patternIds ?? [], pos.day, plan.profile.studyDaysPerWeek),
    [week, pos.day, plan.profile.studyDaysPerWeek]
  );
  const vocabBlockMinutes = blocks.find((b) => b.type === 'vocab')?.minutes ?? 4;
  const { newWords, reviewWords } = useMemo(
    () => selectDailyVocab(CORE_VOCAB, week?.vocabTier ?? 1, dayIndexAbsolute, vocabBlockMinutes),
    [week, dayIndexAbsolute, vocabBlockMinutes]
  );
  const todayVocab = useMemo(() => [...newWords, ...reviewWords], [newWords, reviewWords]);
  const shadowingSentences = useMemo(
    () => buildShadowingSentences(todayPatterns, todayVocab),
    [todayPatterns, todayVocab]
  );

  const studyContext = useMemo<StudyChatContext>(() => ({
    weekTheme: week?.theme ?? '',
    patterns: todayPatterns.map((p) => ({ pattern: p.pattern, meaningKo: p.meaningKo, examples: p.examples })),
    targetWords: newWords.map((w) => w.word),
    dailyMinutes: plan.profile.dailyMinutes,
    goal: plan.profile.goal,
  }), [week, todayPatterns, newWords, plan.profile.dailyMinutes, plan.profile.goal]);

  // ---------- Session progress state ----------
  const [blockIndex, setBlockIndex] = useState(0);
  const [phase, setPhase] = useState<'block' | 'saving' | 'celebration'>('block');
  const [showExit, setShowExit] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<StudyDayResult | null>(null);
  const [updatedStats, setUpdatedStats] = useState<StudyStats | null>(null);

  const countersRef = useRef<SessionCounters>({ spokenSentences: 0, newWordsLearned: 0, shadowingScores: [], startedAt: Date.now() });
  const completedBlocksRef = useRef<StudyBlockType[]>([]);

  const currentBlock = blocks[blockIndex];

  // Per-block soft timer (elapsed seconds).
  const [blockElapsed, setBlockElapsed] = useState(0);
  useEffect(() => {
    setBlockElapsed(0);
    if (phase !== 'block') return;
    const id = setInterval(() => setBlockElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [blockIndex, phase]);

  const advanceBlock = useCallback((completedType: StudyBlockType) => {
    if (!completedBlocksRef.current.includes(completedType)) {
      completedBlocksRef.current.push(completedType);
    }
    if (blockIndex < blocks.length - 1) {
      setBlockIndex((i) => i + 1);
    } else {
      void finalizeSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockIndex, blocks.length]);

  const buildResult = useCallback((): StudyDayResult => {
    const c = countersRef.current;
    const shadowingAccuracy = c.shadowingScores.length
      ? Math.round(c.shadowingScores.reduce((a, b) => a + b, 0) / c.shadowingScores.length)
      : undefined;
    const minutes = Math.max(1, Math.round((Date.now() - c.startedAt) / 60000));
    const result: StudyDayResult = {
      date: localDateString(),
      week: pos.week,
      day: pos.day,
      blocksCompleted: [...completedBlocksRef.current],
      spokenSentences: c.spokenSentences,
      newWordsLearned: c.newWordsLearned,
      shadowingAccuracy,
      minutes,
    };
    if (isWeeklyTestDay) {
      result.isWeeklyTest = true;
      result.weeklyTestScore = weeklyTestScore(c.spokenSentences, shadowingAccuracy);
    }
    return result;
  }, [pos.week, pos.day, isWeeklyTestDay]);

  const saveResult = useCallback(async (result: StudyDayResult) => {
    setPhase('saving');
    setSaveError(null);
    try {
      const res = await fetch('/api/study/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newStats = (data.stats ?? data) as StudyStats;
      setUpdatedStats(newStats);
      setSavedResult(result);
      setPhase('celebration');
    } catch (e) {
      console.error('Save day result failed:', e);
      setSaveError('진행 상황 저장에 실패했어요. 다시 시도해주세요.');
      setPhase('celebration');
      setSavedResult(result);
    }
  }, []);

  const finalizeSession = useCallback(async () => {
    const result = buildResult();
    await saveResult(result);
  }, [buildResult, saveResult]);

  // Confirm-exit: save partial result with completed blocks only.
  const handleConfirmExit = useCallback(async () => {
    setShowExit(false);
    if (completedBlocksRef.current.length === 0) {
      onExit();
      return;
    }
    const result = buildResult();
    try {
      await fetch('/api/study/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      });
    } catch (e) {
      console.error('Partial save failed:', e);
    }
    onExit();
  }, [buildResult, onExit]);

  const incrementSpoken = useCallback(() => {
    countersRef.current.spokenSentences += 1;
  }, []);
  const incrementWords = useCallback((n = 1) => {
    countersRef.current.newWordsLearned += n;
  }, []);
  const pushShadowing = useCallback((score: number) => {
    countersRef.current.shadowingScores.push(score);
  }, []);

  // ---------- Render helpers ----------
  const totalMinutes = plan.profile.dailyMinutes;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-dark-bg">
      <audio ref={voice.audioRef} onEnded={() => voice.setIsPlaying(false)} />
      <audio ref={voice.fillerAudioRef} />

      {/* Header */}
      <header
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        className="px-4 sm:px-6 pb-2 sticky top-0 z-40 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800"
      >
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => (phase === 'celebration' ? onExit() : setShowExit(true))}
            aria-label="나가기"
            className="p-2 -ml-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {pos.week}주차 {pos.day}일차{isWeeklyTestDay ? ' · 주간 테스트' : ''}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{week?.theme}</p>
          </div>
          <div className="w-9" />
        </div>

        {/* Block progress bar */}
        {phase === 'block' && (
          <div className="max-w-lg mx-auto mt-2 flex gap-1">
            {blocks.map((b, i) => (
              <div
                key={b.type}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < blockIndex ? 'bg-primary-500' : i === blockIndex ? 'bg-primary-300 dark:bg-primary-500/50' : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              />
            ))}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {phase === 'saving' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="flex gap-2 mb-4">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">오늘 학습을 저장하고 있어요...</p>
          </div>
        )}

        {phase === 'celebration' && savedResult && (
          <CelebrationScreen
            result={savedResult}
            updatedStats={updatedStats}
            prevStats={stats}
            saveError={saveError}
            nextPreview={
              pos.day < plan.profile.studyDaysPerWeek
                ? `${pos.week}주차 ${pos.day + 1}일차`
                : pos.week < 12
                  ? `${pos.week + 1}주차 · ${plan.weeks.find((w) => w.week === pos.week + 1)?.theme ?? ''}`
                  : '프로그램 완주까지 한 걸음!'
            }
            onDone={() => {
              if (updatedStats) onCompleted(updatedStats);
              else onExit();
            }}
          />
        )}

        {phase === 'block' && currentBlock && (
          <>
            {/* Block header */}
            <div className="px-4 sm:px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{currentBlock.title}</h2>
                <BlockTimer elapsed={blockElapsed} suggestedMinutes={currentBlock.minutes} />
              </div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                {blockIndex + 1} / {blocks.length} 블록 · 예상 {currentBlock.minutes}분 · 하루 {totalMinutes}분
              </p>
            </div>

            <div className="flex-1 flex flex-col px-4 sm:px-6 pb-6">
              {CONVERSATION_BLOCKS.includes(currentBlock.type) ? (
                <ConversationBlock
                  key={currentBlock.type}
                  blockType={currentBlock.type}
                  isWeeklyTest={isWeeklyTestDay && currentBlock.type === 'realtalk'}
                  weeklyTestTopic={week?.weeklyTestTopic}
                  studyContext={studyContext}
                  voice={voice}
                  onSpoke={incrementSpoken}
                  onDone={() => advanceBlock(currentBlock.type)}
                />
              ) : currentBlock.type === 'vocab' ? (
                <VocabBlock
                  key="vocab"
                  words={todayVocab}
                  voice={voice}
                  onWordLearned={() => incrementWords(1)}
                  onDone={() => advanceBlock('vocab')}
                />
              ) : currentBlock.type === 'pattern' ? (
                <PatternBlock
                  key="pattern"
                  patterns={todayPatterns}
                  studyContext={studyContext}
                  voice={voice}
                  onSpoke={incrementSpoken}
                  onDone={() => advanceBlock('pattern')}
                />
              ) : currentBlock.type === 'shadowing' ? (
                <ShadowingBlock
                  key="shadowing"
                  sentences={shadowingSentences}
                  voice={voice}
                  onScore={pushShadowing}
                  onDone={() => advanceBlock('shadowing')}
                />
              ) : null}
            </div>
          </>
        )}
      </main>

      {/* Exit confirm dialog */}
      {showExit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-dark-surface rounded-2xl p-5 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">세션을 종료할까요?</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
              지금까지 완료한 블록({completedBlocksRef.current.length}개)의 진행 상황은 저장돼요.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExit(false)}
                className="flex-1 py-2.5 rounded-xl font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800"
              >
                계속하기
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600"
              >
                종료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Block timer (soft — suggest moving on)
// ============================================
function BlockTimer({ elapsed, suggestedMinutes }: { elapsed: number; suggestedMinutes: number }) {
  const over = elapsed > suggestedMinutes * 60;
  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <span className={`text-xs font-medium tabular-nums ${over ? 'text-amber-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
      {mm}:{ss}
    </span>
  );
}

// ============================================
// Shared record button
// ============================================
type VoiceApi = ReturnType<typeof useStudyVoice>;

function RecordButton({ voice, onTranscript, disabled }: { voice: VoiceApi; onTranscript: (t: string) => void; disabled?: boolean }) {
  const busy = voice.isProcessingSTT || voice.isPlaying || voice.ttsLoading;
  return (
    <button
      onClick={() => voice.toggleRecord({ onTranscript })}
      disabled={disabled || busy}
      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
        voice.isRecording
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
          : busy || disabled
            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
            : 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-600'
      }`}
      aria-label={voice.isRecording ? '녹음 종료' : '말하기'}
    >
      {voice.isProcessingSTT ? (
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : voice.isRecording ? (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </button>
  );
}

function TranscriptBubbles({ messages }: { messages: StudyMessage[] }) {
  return (
    <div className="space-y-2">
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary-500 text-white rounded-br-md'
                : 'bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-bl-md'
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Conversation block (warmup / realtalk / wrapup + weekly test)
// ============================================
function ConversationBlock({
  blockType,
  isWeeklyTest,
  weeklyTestTopic,
  studyContext,
  voice,
  onSpoke,
  onDone,
}: {
  blockType: StudyBlockType;
  isWeeklyTest: boolean;
  weeklyTestTopic?: string;
  studyContext: StudyChatContext;
  voice: VoiceApi;
  onSpoke: () => void;
  onDone: () => void;
}) {
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const openedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const promptLabel =
    isWeeklyTest ? '주간 테스트' :
    blockType === 'warmup' ? '어제 배운 내용을 떠올리며 가볍게 대화해요' :
    blockType === 'wrapup' ? '오늘 배운 내용을 정리하며 마무리해요' :
    '오늘의 패턴과 어휘로 실전 대화를 나눠요';

  // Kick off with an assistant opener from the study endpoint.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    (async () => {
      setThinking(true);
      const seed: StudyMessage[] = [{
        role: 'user',
        content: isWeeklyTest && weeklyTestTopic
          ? `Let's begin the weekly speaking test. Topic: ${weeklyTestTopic}.`
          : `Let's start the ${blockType} for today's lesson.`,
      }];
      const reply = await voice.sendStudyChat(blockType, studyContext, seed);
      if (reply) setMessages([{ role: 'assistant', content: reply }]);
      setThinking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTranscript = useCallback(async (transcript: string) => {
    if (!transcript) return;
    onSpoke();
    const next: StudyMessage[] = [...messages, { role: 'user', content: transcript }];
    setMessages(next);
    setThinking(true);
    const reply = await voice.sendStudyChat(blockType, studyContext, next);
    if (reply) setMessages([...next, { role: 'assistant', content: reply }]);
    setThinking(false);
  }, [messages, blockType, studyContext, voice, onSpoke]);

  return (
    <div className="flex-1 flex flex-col">
      {isWeeklyTest && weeklyTestTopic && (
        <div className="mb-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30">
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-0.5">주간 테스트 주제</p>
          <p className="text-sm text-primary-800 dark:text-primary-200">{weeklyTestTopic}</p>
        </div>
      )}

      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">{promptLabel}</p>

      <div className="flex-1 overflow-y-auto min-h-[180px]">
        <TranscriptBubbles messages={messages} />
        {thinking && (
          <div className="flex gap-1.5 mt-3 ml-1">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex flex-col items-center gap-3 pt-4">
        <RecordButton voice={voice} onTranscript={handleTranscript} disabled={thinking} />
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {voice.isRecording ? '탭하면 종료' : voice.isPlaying ? '튜터가 말하는 중...' : '마이크를 눌러 말해보세요'}
        </p>
        <button
          onClick={onDone}
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          {messages.length > 1 ? '다음 블록으로' : '건너뛰기'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// Vocab block
// ============================================
function VocabBlock({
  words,
  voice,
  onWordLearned,
  onDone,
}: {
  words: CoreVocabItem[];
  voice: VoiceApi;
  onWordLearned: () => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [retried, setRetried] = useState(false);
  const [heardText, setHeardText] = useState('');

  const word = words[index];

  const handleTranscript = useCallback((transcript: string) => {
    setHeardText(transcript);
    setAttempted(true);
    const ok = transcriptContainsWord(transcript, word.word);
    setSuccess(ok);
    if (ok) onWordLearned();
  }, [word, onWordLearned]);

  const goNext = useCallback(() => {
    if (index < words.length - 1) {
      setIndex((i) => i + 1);
      setAttempted(false);
      setSuccess(null);
      setRetried(false);
      setHeardText('');
    } else {
      onDone();
    }
  }, [index, words.length, onDone]);

  const retry = useCallback(() => {
    setAttempted(false);
    setSuccess(null);
    setRetried(true);
    setHeardText('');
  }, []);

  if (!word) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <button onClick={onDone} className="btn-primary px-6 py-3">다음 블록으로</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">{index + 1} / {words.length} 단어</p>

      <div className="flex-1 flex flex-col justify-center">
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800 text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">{word.word}</h3>
            <button
              onClick={() => voice.playTTS(word.word, 0.9)}
              disabled={voice.isPlaying}
              aria-label="발음 듣기"
              className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </button>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">{word.ko}</p>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <p className="text-sm text-neutral-700 dark:text-neutral-200 italic">&ldquo;{word.example}&rdquo;</p>
          </div>
        </div>

        {attempted ? (
          <div className={`p-4 rounded-2xl mb-4 ${success ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30' : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'}`}>
            <p className={`text-sm font-semibold mb-1 ${success ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {success ? '잘했어요! 단어를 사용했어요.' : '단어가 들리지 않았어요.'}
            </p>
            {heardText && <p className="text-xs text-neutral-500 dark:text-neutral-400">들린 문장: {heardText}</p>}
            {!success && !retried && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">예문을 참고해 다시 시도해보세요.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-4">
            이 단어를 넣어 문장을 말해보세요.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        {!attempted && <RecordButton voice={voice} onTranscript={handleTranscript} />}
        {attempted && !success && !retried ? (
          <div className="flex gap-3">
            <button onClick={retry} className="px-5 py-2.5 rounded-xl font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">다시 시도</button>
            <button onClick={goNext} className="btn-primary px-5 py-2.5">다음 단어</button>
          </div>
        ) : attempted ? (
          <button onClick={goNext} className="btn-primary px-6 py-2.5">
            {index < words.length - 1 ? '다음 단어' : '다음 블록으로'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ============================================
// Pattern block
// ============================================
function PatternBlock({
  patterns,
  studyContext,
  voice,
  onSpoke,
  onDone,
}: {
  patterns: GrammarPattern[];
  studyContext: StudyChatContext;
  voice: VoiceApi;
  onSpoke: () => void;
  onDone: () => void;
}) {
  const [round, setRound] = useState(0); // 0..2 (3 spoken rounds)
  const TOTAL_ROUNDS = 3;
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [thinking, setThinking] = useState(false);

  const pattern = patterns[0];

  const handleTranscript = useCallback(async (transcript: string) => {
    if (!transcript) return;
    onSpoke();
    const next: StudyMessage[] = [...messages, { role: 'user', content: transcript }];
    setMessages(next);
    setThinking(true);
    const reply = await voice.sendStudyChat('pattern', studyContext, next);
    if (reply) setMessages([...next, { role: 'assistant', content: reply }]);
    setThinking(false);
    setRound((r) => r + 1);
  }, [messages, studyContext, voice, onSpoke]);

  if (!pattern) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <button onClick={onDone} className="btn-primary px-6 py-3">다음 블록으로</button>
      </div>
    );
  }

  const done = round >= TOTAL_ROUNDS;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-5 rounded-2xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-bold text-primary-700 dark:text-primary-300">{pattern.pattern}</h3>
          <button
            onClick={() => voice.playTTS(pattern.examples[0] ?? pattern.pattern, 0.9)}
            disabled={voice.isPlaying}
            aria-label="예문 듣기"
            className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
        </div>
        <p className="text-sm text-primary-600 dark:text-primary-400 mb-2">{pattern.meaningKo}</p>
        {pattern.examples[0] && (
          <p className="text-sm text-primary-800 dark:text-primary-200 italic">&ldquo;{pattern.examples[0]}&rdquo;</p>
        )}
        {pattern.drillPrompt && (
          <p className="text-xs text-primary-600/80 dark:text-primary-400/80 mt-2">{pattern.drillPrompt}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < round ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
        ))}
        <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-1">{Math.min(round, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[120px]">
        <TranscriptBubbles messages={messages} />
        {thinking && (
          <div className="flex gap-1.5 mt-3 ml-1">
            <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 pt-4">
        {!done ? (
          <>
            <RecordButton voice={voice} onTranscript={handleTranscript} disabled={thinking} />
            <p className="text-xs text-neutral-400 dark:text-neutral-500">이 패턴으로 문장을 만들어 말해보세요 ({round + 1}/{TOTAL_ROUNDS})</p>
          </>
        ) : (
          <button onClick={onDone} className="btn-primary px-6 py-3">다음 블록으로</button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Shadowing block
// ============================================
function ShadowingBlock({
  sentences,
  voice,
  onScore,
  onDone,
}: {
  sentences: string[];
  voice: VoiceApi;
  onScore: (score: number) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<{ accuracy: number; matchedWords: string[]; missedWords: string[] } | null>(null);
  const [retried, setRetried] = useState(false);
  const scoredRef = useRef<Set<number>>(new Set());

  const sentence = sentences[index];

  const handleTranscript = useCallback((transcript: string) => {
    const score = scoreShadowing(sentence, transcript);
    setResult(score);
    // Only count each sentence's score once (best/first attempt) toward the day.
    if (!scoredRef.current.has(index)) {
      scoredRef.current.add(index);
      onScore(score.accuracy);
    }
  }, [sentence, index, onScore]);

  const goNext = useCallback(() => {
    if (index < sentences.length - 1) {
      setIndex((i) => i + 1);
      setResult(null);
      setRetried(false);
    } else {
      onDone();
    }
  }, [index, sentences.length, onDone]);

  const retry = useCallback(() => {
    setResult(null);
    setRetried(true);
  }, []);

  if (!sentence) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <button onClick={onDone} className="btn-primary px-6 py-3">다음 블록으로</button>
      </div>
    );
  }

  const canRetry = result !== null && result.accuracy < 70 && !retried;

  return (
    <div className="flex-1 flex flex-col">
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">{index + 1} / {sentences.length} 문장</p>

      <div className="flex-1 flex flex-col justify-center">
        <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800 text-center mb-4">
          <button
            onClick={() => voice.playTTS(sentence, 0.9)}
            disabled={voice.isPlaying}
            className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 disabled:opacity-60"
            aria-label="문장 듣기"
          >
            {voice.isPlaying ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <p className="text-lg font-medium text-neutral-900 dark:text-white leading-relaxed">
            {result
              ? sentence.split(/\s+/).map((w, i) => {
                  const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
                  const missed = result.missedWords.some((m) => m.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
                  return (
                    <span key={i} className={missed ? 'text-red-500 dark:text-red-400 font-semibold' : ''}>
                      {w}{' '}
                    </span>
                  );
                })
              : sentence}
          </p>
        </div>

        {result && (
          <div className={`p-4 rounded-2xl mb-2 text-center ${result.accuracy >= 70 ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30' : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'}`}>
            <p className={`text-2xl font-bold ${result.accuracy >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {result.accuracy}%
            </p>
            {result.missedWords.length > 0 && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                놓친 단어: {result.missedWords.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        {!result ? (
          <>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">먼저 듣고, 따라 말해보세요</p>
            <RecordButton voice={voice} onTranscript={handleTranscript} />
          </>
        ) : canRetry ? (
          <div className="flex gap-3">
            <button onClick={retry} className="px-5 py-2.5 rounded-xl font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">다시 시도</button>
            <button onClick={goNext} className="btn-primary px-5 py-2.5">{index < sentences.length - 1 ? '다음 문장' : '다음 블록으로'}</button>
          </div>
        ) : (
          <button onClick={goNext} className="btn-primary px-6 py-2.5">
            {index < sentences.length - 1 ? '다음 문장' : '다음 블록으로'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Celebration screen
// ============================================
function CelebrationScreen({
  result,
  updatedStats,
  prevStats,
  saveError,
  nextPreview,
  onDone,
}: {
  result: StudyDayResult;
  updatedStats: StudyStats | null;
  prevStats: StudyStats | null;
  saveError: string | null;
  nextPreview: string;
  onDone: () => void;
}) {
  const xp = dayXP(result);
  const streak = updatedStats?.currentStreak ?? (prevStats?.currentStreak ?? 0) + 1;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center motion-safe:animate-scale-in">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-5 shadow-lg shadow-primary-500/30">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">오늘 학습 완료!</h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        {result.week}주차 {result.day}일차를 마쳤어요.
      </p>

      <div className="w-full max-w-xs p-4 rounded-2xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 mb-4">
        <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">+{xp} XP</p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-4">
        <div className="p-3 rounded-xl bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800">
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{result.spokenSentences}</p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">발화 문장</p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800">
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{result.newWordsLearned}</p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">습득 단어</p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-dark-surface border border-neutral-100 dark:border-neutral-800">
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{result.shadowingAccuracy ?? '-'}{result.shadowingAccuracy ? '%' : ''}</p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">쉐도잉</p>
        </div>
      </div>

      {result.isWeeklyTest && result.weeklyTestScore !== undefined && (
        <div className="w-full max-w-xs p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 mb-4">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-0.5">주간 테스트 점수</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{result.weeklyTestScore}점</p>
        </div>
      )}

      <div className="w-full max-w-xs p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 mb-2">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">연속 학습</p>
        <p className="text-lg font-bold text-neutral-900 dark:text-white">{streak}일째</p>
      </div>

      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">다음: {nextPreview}</p>

      {saveError && (
        <p className="text-xs text-red-500 dark:text-red-400 mb-3">{saveError}</p>
      )}

      <button onClick={onDone} className="btn-primary px-8 py-3 w-full max-w-xs">대시보드로</button>
    </div>
  );
}
