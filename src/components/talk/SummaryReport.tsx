'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Language } from '@/lib/i18n';
import type { Persona } from '@/lib/personas';
import type { SpeechMetrics } from '@/lib/speechMetrics';
import type { VocabBookItem } from '@/lib/sheetTypes';
import type { SpeakingEvaluationResponse } from '@/app/api/speaking-evaluate/route';
import { calculateLearningRank } from '@/lib/learningRank';
import TutorAvatar from '@/components/TutorAvatar';
import TapTalkLogo from '@/components/TapTalkLogo';
import AnalysisReview from '@/components/AnalysisReview';
import ShareableReportCard from '@/components/talk/ShareableReportCard';

interface LevelDetails {
  grammar: number;
  vocabulary: number;
  fluency: number;
  comprehension: number;
  summary: string;
}

interface ErrorPattern {
  type: string;
  count: number;
  tip: string;
}

interface Analysis {
  corrections: { original: string; intended: string; corrected: string; explanation: string; category: string }[];
  patterns: ErrorPattern[];
  strengths: string[];
  overallLevel: string;
  evaluatedGrade?: string;
  levelDetails?: LevelDetails;
  encouragement: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface SummaryTranslations {
  sessionComplete: string;
  whatYouDidWell: string;
  areasToFocus: string;
  backToHome: string;
  practiceAgain: string;
}

export interface SummaryReportProps {
  analysis: Analysis | null;
  speechMetrics: SpeechMetrics | null;
  speakingEval: SpeakingEvaluationResponse['evaluation'] | null;
  isLoadingEval: boolean;
  repeatedCategories: Set<string>;
  sessionVocab: VocabBookItem[];
  birthYear: number | null;
  userName: string;
  tutorId: string;
  persona: Persona;
  language: Language;
  t: SummaryTranslations;
  summaryRef: React.RefObject<HTMLDivElement>;
  isSavingImage: boolean;
  saveAsImage: () => void;
  onBackHome: () => void;
  onPracticeAgain: () => void;
  conversationTime?: number;
}

export default function SummaryReport({
  analysis,
  speechMetrics,
  speakingEval,
  isLoadingEval,
  repeatedCategories,
  sessionVocab,
  birthYear,
  userName,
  tutorId,
  persona,
  language,
  t,
  summaryRef,
  isSavingImage,
  saveAsImage,
  onBackHome,
  onPracticeAgain,
  conversationTime = 0,
}: SummaryReportProps) {
  const router = useRouter();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isSharingReport, setIsSharingReport] = useState(false);

  const shareReport = async () => {
    if (!shareCardRef.current) return;
    setIsSharingReport(true);
    try {
      await document.fonts.ready;
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: null,
        scale: 2, // 540×960 × 2 = 1080×1920
        useCORS: true,
        logging: false,
        allowTaint: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const date = new Date().toISOString().split('T')[0];
      const fileName = `taptalk-story-${date}.png`;

      if (typeof navigator !== 'undefined' && navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        try {
          await navigator.share({ files: [file], title: 'My TapTalk Report' });
          return;
        } catch {
          // fall through to download
        }
      }

      // Fallback: download
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to share report:', error);
    } finally {
      setIsSharingReport(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto dark:bg-[#020617] bg-neutral-50">
      {/* Action Buttons: Share Report + Save Image */}
      <div className="sticky top-0 z-10 flex justify-end gap-2 p-4 bg-gradient-to-b dark:from-[#020617] from-neutral-50 dark:via-[#020617]/80 via-neutral-50/80 to-transparent">
        {/* Share Report Card (Instagram Story format) */}
        <button
          onClick={shareReport}
          disabled={isSharingReport || isSavingImage}
          className="flex items-center gap-2 px-4 py-2.5 text-sm report-glass rounded-xl dark:text-white/70 text-zinc-600 dark:hover:text-white hover:text-zinc-900 dark:hover:bg-white/10 hover:bg-black/[0.06] transition-all disabled:opacity-50"
        >
          {isSharingReport ? (
            <div className="w-4 h-4 border-2 dark:border-white/40 border-zinc-400/60 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
          {language === 'ko' ? '카드 공유' : 'Share Card'}
        </button>

        {/* Save full report as image */}
        <button
          onClick={saveAsImage}
          disabled={isSavingImage || isSharingReport}
          className="flex items-center gap-2 px-4 py-2.5 text-sm report-glass rounded-xl dark:text-white/70 text-zinc-600 dark:hover:text-white hover:text-zinc-900 dark:hover:bg-white/10 hover:bg-black/[0.06] transition-all disabled:opacity-50"
        >
          {isSavingImage ? (
            <div className="w-4 h-4 border-2 dark:border-white/40 border-zinc-400/60 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          {language === 'ko' ? '이미지 저장' : 'Save Image'}
        </button>
      </div>

      {/* Hidden shareable card — rendered off-screen, captured by html2canvas */}
      <ShareableReportCard
        ref={shareCardRef}
        analysis={analysis}
        tutorId={tutorId}
        persona={persona}
        speechMetrics={speechMetrics}
        conversationTime={conversationTime}
        language={language}
        userName={userName}
      />

      {/* Report Content - for image capture */}
      <div ref={summaryRef} className="overflow-hidden px-4 pb-4 space-y-1">
        {/* Section: Header + Tutor */}
        <div data-report-section className="bg-gradient-to-b from-slate-900/80 dark:from-slate-900/80 from-neutral-200/80 to-transparent p-4">
          <div className="flex items-center justify-between text-xs mb-4 pb-3 border-b dark:border-white/10 border-black/[0.08]">
            <div className="flex items-center gap-2">
              <TapTalkLogo size="sm" theme="light" iconOnly />
              <span className="font-semibold dark:text-white text-zinc-900">{userName || 'Student'}</span>
              {birthYear && (
                <span className="dark:text-slate-400 text-zinc-500">
                  ({language === 'ko' ? '만' : 'Age'} {new Date().getFullYear() - birthYear}{language === 'ko' ? '세' : ''})
                </span>
              )}
            </div>
            <span className="dark:text-slate-400 text-zinc-500">{new Date().toLocaleDateString()}</span>
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TutorAvatar
                tutorId={tutorId as 'emma' | 'james' | 'charlotte' | 'oliver'}
                size="lg"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold dark:text-white text-zinc-900">{t.sessionComplete}</h2>
            <p className="dark:text-slate-400 text-zinc-500 text-sm mt-1">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* AnalysisReview renders its own data-report-sections */}
        {speechMetrics && (
          <AnalysisReview speechMetrics={speechMetrics} language={language} />
        )}

      {analysis && (
        <>
          {/* Section 2: Assessments */}
          <div data-report-section className="px-0 py-2 space-y-3">
          {/* AI Evaluated Level */}
          {analysis.evaluatedGrade && analysis.levelDetails && (
            <div className="report-glass rounded-2xl p-4 sm:p-6 report-fade-up report-fade-up-1">
              <h3 className="font-semibold dark:text-white text-zinc-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                {language === 'ko' ? '오늘의 레벨 평가' : "Today's Level Assessment"}
              </h3>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{analysis.evaluatedGrade}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs dark:text-slate-400 text-zinc-500">{language === 'ko' ? 'CEFR 등급' : 'CEFR Level'}</p>
                    {analysis.confidence && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        analysis.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                        analysis.confidence === 'low' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {analysis.confidence === 'high' ? (language === 'ko' ? '신뢰도 높음' : 'High confidence') :
                         analysis.confidence === 'low' ? (language === 'ko' ? '대화 부족' : 'Low confidence') :
                         (language === 'ko' ? '보통' : 'Medium')}
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold dark:text-white text-zinc-900">
                    {analysis.evaluatedGrade === 'Pre-A1' && (language === 'ko' ? '입문' : 'Beginner')}
                    {analysis.evaluatedGrade === 'A1' && (language === 'ko' ? '초급' : 'Elementary')}
                    {analysis.evaluatedGrade === 'A2' && (language === 'ko' ? '초중급' : 'Pre-Intermediate')}
                    {analysis.evaluatedGrade === 'B1' && (language === 'ko' ? '중급' : 'Intermediate')}
                    {analysis.evaluatedGrade === 'B2' && (language === 'ko' ? '중상급' : 'Upper-Intermediate')}
                    {analysis.evaluatedGrade === 'C1' && (language === 'ko' ? '고급' : 'Advanced')}
                    {analysis.evaluatedGrade === 'C2' && (language === 'ko' ? '최상급' : 'Proficient')}
                  </p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: language === 'ko' ? '문법' : 'Grammar', value: analysis.levelDetails.grammar, color: 'bg-blue-500' },
                  { label: language === 'ko' ? '어휘' : 'Vocabulary', value: analysis.levelDetails.vocabulary, color: 'bg-green-500' },
                  { label: language === 'ko' ? '유창성' : 'Fluency', value: analysis.levelDetails.fluency, color: 'bg-purple-500' },
                  { label: language === 'ko' ? '이해력' : 'Comprehension', value: analysis.levelDetails.comprehension, color: 'bg-amber-500' },
                ].map((item) => (
                  <div key={item.label} className="dark:bg-white/[0.04] bg-black/[0.03] rounded-lg p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs dark:text-slate-400 text-zinc-500">{item.label}</span>
                      <span className="text-xs font-bold dark:text-white text-zinc-900">{item.value}</span>
                    </div>
                    <div className="h-1.5 dark:bg-white/10 bg-black/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full progress-segment`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {analysis.levelDetails.summary && (
                <p className="mt-3 text-xs sm:text-sm dark:text-slate-400 text-zinc-500 italic">{analysis.levelDetails.summary}</p>
              )}
            </div>
          )}

          {/* Speaking Evaluation - Grade Level & Test Scores */}
          {(isLoadingEval || speakingEval) && (
            <div className="report-glass rounded-2xl p-4 sm:p-6 report-fade-up report-fade-up-2">
              <h3 className="font-semibold dark:text-white text-zinc-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                {language === 'ko' ? '영어 능숙도 분석' : 'English Proficiency Analysis'}
              </h3>

              {isLoadingEval ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  <span className="ml-3 text-sm dark:text-slate-400 text-zinc-500">
                    {language === 'ko' ? 'Speaking 분석 중...' : 'Analyzing speaking metrics...'}
                  </span>
                </div>
              ) : speakingEval && (
                <>
                  {/* Primary CEFR Level */}
                  <div className="flex items-center gap-4 mb-4 p-3 dark:bg-white/[0.04] bg-black/[0.03] rounded-xl">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{speakingEval.cefrLevel?.level}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold dark:text-white text-zinc-900">{speakingEval.cefrLevel?.label}</p>
                      <p className="text-xs dark:text-slate-400 text-zinc-500">{speakingEval.cefrLevel?.description}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                        speakingEval.cefrLevel?.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        speakingEval.cefrLevel?.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                      }`}>
                        {language === 'ko' ? '신뢰도' : 'Confidence'}: {speakingEval.cefrLevel?.confidence}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] dark:text-slate-400 text-zinc-500 mb-3 italic">
                    {language === 'ko'
                      ? '* CEFR (유럽공통참조기준) 기반으로 측정됩니다.'
                      : '* Measured using CEFR (Common European Framework) benchmarks for language learners.'}
                  </p>

                  {/* Test Score Equivalents */}
                  {speakingEval.testScores && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      {/* IELTS */}
                      <div className="dark:bg-white/[0.04] bg-black/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[10px] dark:text-slate-400 text-zinc-500">IELTS Speaking</p>
                        <p className="text-lg font-bold text-red-600">{speakingEval.testScores.ielts?.band}</p>
                        <p className="text-[9px] dark:text-slate-500 text-zinc-400">/9.0</p>
                      </div>
                      {/* TOEFL */}
                      <div className="dark:bg-white/[0.04] bg-black/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[10px] dark:text-slate-400 text-zinc-500">TOEFL Speaking</p>
                        <p className="text-lg font-bold text-blue-600">{speakingEval.testScores.toefl?.score}</p>
                        <p className="text-[9px] dark:text-slate-500 text-zinc-400">/30</p>
                      </div>
                      {/* TOEIC */}
                      <div className="dark:bg-white/[0.04] bg-black/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[10px] dark:text-slate-400 text-zinc-500">TOEIC Speaking</p>
                        <p className="text-lg font-bold text-amber-600">{speakingEval.testScores.toeic?.score}</p>
                        <p className="text-[9px] dark:text-slate-500 text-zinc-400">/200 (Lv.{speakingEval.testScores.toeic?.level})</p>
                      </div>
                      {/* CEFR */}
                      <div className="dark:bg-white/[0.04] bg-black/[0.03] rounded-lg p-2 text-center">
                        <p className="text-[10px] dark:text-slate-400 text-zinc-500">CEFR</p>
                        <p className="text-lg font-bold text-purple-600">{speakingEval.testScores.cefr?.level}</p>
                      </div>
                    </div>
                  )}

                  {/* Metrics Breakdown */}
                  {speakingEval.metrics && (
                    <div className="dark:bg-white/[0.04] bg-black/[0.03] rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium dark:text-slate-300 text-zinc-600 mb-2">
                        {language === 'ko' ? '측정 지표' : 'Measured Metrics'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="dark:text-slate-400 text-zinc-500">{language === 'ko' ? '평균 응답 길이' : 'Avg words/turn'}</span>
                          <span className="font-medium dark:text-white text-zinc-900">{speakingEval.metrics.avgWordsPerTurn}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="dark:text-slate-400 text-zinc-500">{language === 'ko' ? '어휘 다양성' : 'Lexical diversity'}</span>
                          <span className="font-medium dark:text-white text-zinc-900">{Math.round(speakingEval.metrics.vocabulary?.lexicalDiversity * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="dark:text-slate-400 text-zinc-500">{language === 'ko' ? '학술 어휘' : 'Academic vocab'}</span>
                          <span className="font-medium dark:text-white text-zinc-900">{speakingEval.metrics.vocabulary?.tier2Percentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="dark:text-slate-400 text-zinc-500">{language === 'ko' ? '복문 비율' : 'Complex sentences'}</span>
                          <span className="font-medium dark:text-white text-zinc-900">{speakingEval.metrics.sentenceComplexity?.complexRatio}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Age Comparison */}
                  {speakingEval.comparison?.expectedForAge && (
                    <div className="dark:bg-white/[0.04] bg-black/[0.03] rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium dark:text-slate-300 text-zinc-600 mb-1">
                        {language === 'ko' ? '나이 대비 수준' : 'Performance vs Age'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          speakingEval.comparison.performanceVsExpected === 'above' ? 'bg-green-100 text-green-700' :
                          speakingEval.comparison.performanceVsExpected === 'at' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {speakingEval.comparison.performanceVsExpected === 'above'
                            ? (language === 'ko' ? '기대치 이상' : 'Above Expected')
                            : speakingEval.comparison.performanceVsExpected === 'at'
                            ? (language === 'ko' ? '기대치 수준' : 'At Expected Level')
                            : (language === 'ko' ? '기대치 미만' : 'Below Expected')}
                        </span>
                        <span className="text-xs dark:text-slate-400 text-zinc-500">
                          {language === 'ko'
                            ? `기대 학년: ${speakingEval.comparison.expectedForAge}`
                            : `Expected: Grade ${speakingEval.comparison.expectedForAge}`}
                          {speakingEval.comparison.gradeGap != null && speakingEval.comparison.gradeGap !== 0 && (
                            <span className={speakingEval.comparison.gradeGap > 0 ? 'text-green-600' : 'text-amber-600'}>
                              {' '}({speakingEval.comparison.gradeGap > 0 ? '+' : ''}{speakingEval.comparison.gradeGap})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {speakingEval.feedback && (
                    <>
                      {/* Strengths */}
                      {speakingEval.feedback.strengths?.length > 0 && (
                        <div className="bg-green-50/50 dark:bg-green-500/10 rounded-lg p-3 mb-2">
                          <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                            {language === 'ko' ? '강점' : 'Strengths'}
                          </p>
                          <ul className="space-y-0.5">
                            {speakingEval.feedback.strengths.slice(0, 3).map((s: string, i: number) => (
                              <li key={i} className="text-xs text-green-700 dark:text-green-400 flex items-start gap-1">
                                <span>✓</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Next Steps */}
                      {speakingEval.feedback.nextSteps?.length > 0 && (
                        <div className="bg-blue-50/50 dark:bg-blue-500/10 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                            {language === 'ko' ? '다음 단계' : 'Next Steps'}
                          </p>
                          <ul className="space-y-0.5">
                            {speakingEval.feedback.nextSteps.slice(0, 3).map((s: string, i: number) => (
                              <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-1">
                                <span>→</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improvement Guide */}
                      {speakingEval.improvementGuide?.length > 0 && (
                        <div className="mt-3 border border-amber-200 dark:border-amber-500/20 rounded-lg overflow-hidden">
                          <div className="bg-amber-50 dark:bg-amber-500/10 px-3 py-2 border-b border-amber-200 dark:border-amber-500/20">
                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>
                              {language === 'ko' ? '개선 로드맵 — 이렇게 연습하세요' : 'Improvement Roadmap — How to Practice'}
                            </p>
                          </div>
                          <div className="divide-y divide-amber-100 dark:divide-amber-500/10">
                            {speakingEval.improvementGuide.map((item: {
                              area: string; icon: string; currentLevel: string; targetLevel: string;
                              priority: string; tips: string[]; examplePhrases: string[]; miniChallenge: string;
                            }, idx: number) => (
                              <div key={idx} className="p-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                                    {item.icon === 'book' ? (
                                      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                    ) : item.icon === 'link' ? (
                                      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    ) : item.icon === 'shuffle' ? (
                                      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
                                    ) : item.icon === 'pencil' ? (
                                      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    ) : item.icon === 'ruler' ? (
                                      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z"/><line x1="14.5" y1="12.5" x2="11.5" y2="9.5"/></svg>
                                    ) : (
                                      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                                    )} {item.area}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    item.priority === 'high' ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400' :
                                    item.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                                    'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300'
                                  }`}>
                                    {item.priority === 'high' ? (language === 'ko' ? '우선' : 'Priority') :
                                     item.priority === 'medium' ? (language === 'ko' ? '권장' : 'Recommended') :
                                     (language === 'ko' ? '참고' : 'Optional')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] text-gray-500 dark:text-neutral-400 bg-gray-50 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                                    {item.currentLevel}
                                  </span>
                                  <span className="text-[10px] text-gray-400 dark:text-neutral-500">→</span>
                                  <span className="text-[10px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded font-medium">
                                    {item.targetLevel}
                                  </span>
                                </div>
                                <ul className="space-y-0.5 mb-2">
                                  {item.tips.map((tip: string, ti: number) => (
                                    <li key={ti} className="text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1">
                                      <span className="text-amber-400 mt-0.5">•</span> {tip}
                                    </li>
                                  ))}
                                </ul>
                                {item.examplePhrases.length > 0 && (
                                  <div className="bg-white/60 dark:bg-white/5 rounded p-2 mb-2">
                                    <p className="text-[10px] font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                      {language === 'ko' ? '연습 표현' : 'Practice Phrases'}
                                    </p>
                                    {item.examplePhrases.slice(0, 2).map((phrase: string, pi: number) => (
                                      <p key={pi} className="text-[11px] text-gray-700 dark:text-neutral-300 italic">{phrase}</p>
                                    ))}
                                  </div>
                                )}
                                <div className="bg-amber-100/50 dark:bg-amber-500/10 rounded px-2 py-1.5">
                                  <p className="text-[11px] text-amber-900 dark:text-amber-300 font-medium flex items-center gap-1">
                                    <svg className="w-3 h-3 inline-block flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> {item.miniChallenge}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          </div>

          {/* Section 3: Feedback */}
          <div data-report-section className="px-0 pb-2 space-y-3">
          {/* Strengths */}
          <div className="report-glass rounded-2xl p-4 sm:p-6 report-fade-up report-fade-up-3">
            <h3 className="font-semibold dark:text-white text-zinc-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {t.whatYouDidWell}
            </h3>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="dark:text-slate-300 text-zinc-600 text-xs sm:text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Error Patterns */}
          {analysis.patterns.length > 0 && (
            <div className="report-glass rounded-2xl p-4 sm:p-6 report-fade-up report-fade-up-4">
              <h3 className="font-semibold dark:text-white text-zinc-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                {t.areasToFocus}
              </h3>
              <div className="space-y-3">
                {analysis.patterns.map((pattern, idx) => {
                  const lower = pattern.type.toLowerCase();
                  const patternCategory = (lower.includes('vocab') || lower.includes('word choice') || lower.includes('collocation'))
                    ? 'vocabulary'
                    : (lower.includes('pronunc'))
                    ? 'pronunciation'
                    : 'grammar';
                  const isRepeated = repeatedCategories.has(patternCategory);
                  return (
                  <div key={idx} className={`p-3 bg-amber-500/[0.06] border border-amber-500/[0.12] rounded-xl ${isRepeated ? 'border-2 border-amber-400' : ''}`}>
                    {isRepeated && (
                      <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-amber-500/20 rounded-lg">
                        <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Recurring Pattern</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-amber-300 text-sm">{pattern.type}</span>
                        {isRepeated && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Habit Alert</span>
                        )}
                      </div>
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{pattern.count}x</span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-400">{pattern.tip}</p>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Encouragement */}
          <div className="report-glass rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-violet-500/[0.08] to-transparent report-fade-up report-fade-up-5">
            <p className="dark:text-white text-zinc-900 italic text-sm sm:text-base">&ldquo;{analysis.encouragement}&rdquo;</p>
            <p className="text-xs sm:text-sm text-violet-400 mt-2">— {persona.name}</p>
          </div>

          {/* Learning Rank */}
          {analysis.levelDetails && (
            (() => {
              const rank = calculateLearningRank({
                levelDetails: analysis.levelDetails,
                currentLevel: analysis.evaluatedGrade,
              });
              return (
                <div className="report-glass rounded-2xl p-4 sm:p-6 report-fade-up report-fade-up-5">
                  <h3 className="font-semibold dark:text-white text-zinc-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </span>
                    {language === 'ko' ? '학습 포지션' : 'Learning Position'}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{rank.compositeScore}</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold dark:text-white text-zinc-900">{rank.band}</p>
                      <p className="text-xs dark:text-slate-400 text-zinc-500">
                        {language === 'ko' ? '종합 점수' : 'Composite Score'}: {rank.compositeScore}/100
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 dark:bg-white/10 bg-black/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-1000"
                      style={{ width: `${rank.compositeScore}%` }}
                    />
                  </div>
                </div>
              );
            })()
          )}

          {/* Session Vocabulary */}
          {sessionVocab.length > 0 && (
            <div className="report-glass rounded-2xl p-4 sm:p-6 report-fade-up report-fade-up-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold dark:text-white text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-teal-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </span>
                  {language === 'ko' ? `오늘의 단어장 (${sessionVocab.length})` : `Session Vocabulary (${sessionVocab.length})`}
                </h3>
                <button
                  onClick={() => router.push('/vocab-book')}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  {language === 'ko' ? '전체 보기' : 'View All'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sessionVocab.slice(0, 8).map((item) => (
                  <div key={item.id} className="dark:bg-white/[0.04] bg-black/[0.03] rounded-lg p-2.5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium dark:text-white text-zinc-900">{item.term}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-3 rounded-full ${i < item.difficulty ? 'bg-teal-400' : 'dark:bg-white/10 bg-black/[0.06]'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="h-1 dark:bg-white/10 bg-black/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${item.proficiency}%` }}
                      />
                    </div>
                    <p className="text-[10px] dark:text-slate-500 text-zinc-400 mt-1 truncate">{item.sourceSentence}</p>
                  </div>
                ))}
              </div>
              {sessionVocab.length > 8 && (
                <button
                  onClick={() => router.push('/vocab-book')}
                  className="text-xs text-teal-400 hover:text-teal-300 mt-2 text-center w-full transition-colors"
                >
                  +{sessionVocab.length - 8} {language === 'ko' ? '개 더 보기 →' : 'more →'}
                </button>
              )}
            </div>
          )}
          </div>
        </>
      )}
      </div>
      {/* End of Report Content */}

      <div className="flex gap-3 sm:gap-4 mt-6 px-0">
        <button onClick={onBackHome} className="flex-1 report-glass rounded-2xl dark:text-white/70 text-zinc-600 dark:hover:text-white hover:text-zinc-900 dark:hover:bg-white/10 hover:bg-black/[0.06] transition-all py-3 sm:py-4 text-sm sm:text-base font-medium">
          {t.backToHome}
        </button>
        <button onClick={onPracticeAgain} className="flex-1 btn-primary text-sm sm:text-base py-3 sm:py-4">
          {t.practiceAgain}
        </button>
      </div>

      {/* Share Story Button */}
      <div className="mt-4 px-0">
        <button
          onClick={shareReport}
          disabled={isSharingReport}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl report-glass dark:text-white/70 text-zinc-600 dark:hover:text-white hover:text-zinc-900 dark:hover:bg-white/10 hover:bg-black/[0.06] transition-all text-sm font-medium disabled:opacity-50"
        >
          {isSharingReport ? (
            <div className="w-4 h-4 border-2 dark:border-white/40 border-zinc-400/60 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
          {language === 'ko' ? '스토리로 공유하기' : 'Share as Story'}
        </button>
      </div>

      {/* Off-screen shareable report card for html2canvas capture */}
      <ShareableReportCard
        ref={shareCardRef}
        analysis={analysis}
        tutorId={tutorId}
        persona={persona}
        speechMetrics={speechMetrics}
        conversationTime={conversationTime}
        language={language}
        userName={userName}
      />
    </div>
  );
}
