'use client';

import { useEffect, useRef } from 'react';
import { SpeechMetrics, getAgeGroup, calculateAdaptiveDifficulty } from '@/lib/speechMetrics';
import { buildSessionVocabItems } from '@/lib/vocabBook';
import type { VocabBookItem } from '@/lib/sheetTypes';

interface Correction {
  original: string;
  intended: string;
  corrected: string;
  explanation: string;
  category: string;
}

interface ErrorPattern {
  type: string;
  count: number;
  tip: string;
}

interface LevelDetails {
  grammar: number;
  vocabulary: number;
  fluency: number;
  comprehension: number;
  summary: string;
}

export interface AnalysisResult {
  corrections: Correction[];
  patterns: ErrorPattern[];
  strengths: string[];
  overallLevel: string;
  evaluatedGrade?: string;
  levelDetails?: LevelDetails;
  encouragement: string;
  confidence?: 'high' | 'medium' | 'low';
}

export function useSessionPersistence(options: {
  phase: string;
  analysis: AnalysisResult | null;
  messages: Array<{ role: string; content: string }>;
  conversationTime: number;
  tutorId: string;
  language: string;
  birthYear: number | null;
  previousGrade: string | null;
  previousLevelDetails: { grammar: number; vocabulary: number; fluency: number; comprehension: number } | null;
  speechMetrics: SpeechMetrics | null;
  correctionLevel: 1 | 2 | 3 | 4;
  onVocabSaved?: (items: VocabBookItem[]) => void;
}): { resetSaved: () => void } {
  const {
    phase,
    analysis,
    messages,
    conversationTime,
    tutorId,
    language,
    birthYear,
    previousGrade,
    previousLevelDetails,
    speechMetrics,
    onVocabSaved,
  } = options;

  const hasSavedSessionRef = useRef(false);

  // Stable ref for callback — avoids dependency churn in useEffect
  const onVocabSavedRef = useRef(onVocabSaved);
  onVocabSavedRef.current = onVocabSaved;

  // Increment session count and store evaluated level when session is completed (summary phase)
  // IMPORTANT: API calls are chained sequentially to avoid race conditions on shared
  // Google Sheets rows (LearningData and Users). Previously, parallel fire-and-forget
  // calls caused data loss (last-write-wins on the same row).
  useEffect(() => {
    if (phase === 'summary') {
      if (hasSavedSessionRef.current) return;
      hasSavedSessionRef.current = true;
      const saveSessionData = async () => {
        try {
          // Step 1: Increment session count first (updates Users + Subscriptions sheets)
          // Must complete before lesson-history to avoid overwriting sessionCount
          const countBody: { evaluatedGrade?: string; levelDetails?: LevelDetails } = {};
          if (analysis?.evaluatedGrade) {
            countBody.evaluatedGrade = analysis.evaluatedGrade;
          }
          if (analysis?.levelDetails) {
            countBody.levelDetails = analysis.levelDetails;
          }

          const countRes = await fetch('/api/session-count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(countBody),
          });
          if (!countRes.ok) {
            console.error('session-count save failed:', countRes.status);
          } else {
            await countRes.json();
          }

          // Step 2: Save lesson history WITH corrections in a single call
          // This avoids the race condition where addSession and addCorrections
          // would read-modify-write the same LearningData row concurrently
          const userMessages = messages.filter(m => m.role === 'user');
          const topicSummary = userMessages.length > 0
            ? userMessages.slice(0, 3).map(m => m.content.slice(0, 50)).join(' / ')
            : 'Free conversation';

          const feedbackSummary = analysis
            ? `${analysis.overallLevel}. ${analysis.encouragement.slice(0, 100)}`
            : '';

          const keyCorrections = analysis?.corrections
            ?.slice(0, 5)
            .map(c => `${c.original} -> ${c.corrected}`)
            .join('; ') || '';

          // Prepare corrections to include in the same request
          let correctionsToSave;
          if (analysis?.corrections && analysis.corrections.length > 0) {
            const ageGroup = birthYear ? getAgeGroup(birthYear) : null;
            const adaptiveDifficulty = ageGroup
              ? calculateAdaptiveDifficulty(ageGroup, previousGrade, previousLevelDetails, speechMetrics)
              : null;
            const correctionDifficulty = adaptiveDifficulty?.difficulty ?? 3;

            correctionsToSave = analysis.corrections.map(c => ({
              original: c.original,
              corrected: c.corrected,
              explanation: c.explanation,
              category: c.category || 'general',
              difficulty: correctionDifficulty,
            }));
          }

          const historyRes = await fetch('/api/lesson-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tutor: tutorId,
              duration: Math.floor(conversationTime / 60),
              topicSummary,
              feedbackSummary,
              keyCorrections,
              level: analysis?.evaluatedGrade || '',
              levelDetails: analysis?.levelDetails || null,
              corrections: correctionsToSave,
              language,
            }),
          });
          if (!historyRes.ok) {
            console.error('lesson-history save failed:', historyRes.status);
          } else {
            await historyRes.json();
          }

          // Step 3: Build and save vocab book items
          try {
            const userUtterances = messages.filter(m => m.role === 'user').map(m => m.content);
            const vocabItems = buildSessionVocabItems({
              userUtterances,
              corrections: analysis?.corrections?.map(c => ({
                original: c.original,
                corrected: c.corrected,
                category: c.category,
              })),
              sourceSessionId: `${tutorId}-${Date.now()}`,
            });
            onVocabSavedRef.current?.(vocabItems);

            if (vocabItems.length > 0) {
              const vocabRes = await fetch('/api/vocab-book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: vocabItems }),
              });
              if (!vocabRes.ok) {
                console.error(`Vocab book save failed: HTTP ${vocabRes.status}`);
              }
            }
          } catch (vocabErr) {
            console.error('Vocab book save failed:', vocabErr);
          }
        } catch (err) {
          console.error('Failed to save session data:', err);
        }
      };

      saveSessionData();
    }
  }, [phase, analysis, messages, tutorId, conversationTime, birthYear, previousGrade, previousLevelDetails, speechMetrics, language]);

  const resetSaved = () => {
    hasSavedSessionRef.current = false;
  };

  return { resetSaved };
}
