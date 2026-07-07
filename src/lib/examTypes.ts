/**
 * Exam Mode — 토익스피킹/오픽 모의 스피킹 테스트 + AI 예상 등급.
 * Shared contract between backend (question bank, grading route) and frontend (exam runner).
 * Storage: stats.examHistory (JSONB additive, no migration).
 *
 * 등급 표기는 "예상 등급(참고용)"으로만 제시 — 실제 시험 주관사와 무관함을 UI에 명시할 것.
 */

export type ExamType = 'toeic-speaking' | 'opic';

export type ExamTaskType =
  | 'read-aloud'      // 지문 소리내어 읽기 (토스)
  | 'qa'              // 질문 듣고 답하기
  | 'opinion'         // 의견 제시
  | 'self-intro'      // 자기소개 (오픽)
  | 'roleplay'        // 상황극/요청 (오픽)
  | 'unexpected';     // 돌발 질문 (오픽)

export interface ExamTask {
  id: string;               // "ts-ra-01", "op-qa-03"
  examType: ExamType;
  type: ExamTaskType;
  order: number;            // position in the exam flow
  promptKo: string;         // 한국어 지시문
  promptEn: string;         // 실제 문제 (읽을 지문 or 질문)
  prepSeconds: number;      // 준비 시간
  answerSeconds: number;    // 답변 시간
}

/** One full mock-exam form (fixed task sequence). */
export interface ExamForm {
  examType: ExamType;
  formId: string;           // "ts-form-1"
  titleKo: string;
  tasks: ExamTask[];
  totalMinutes: number;     // approximate
}

// ---- Grading ----

export interface ExamAnswer {
  taskId: string;
  transcript: string;       // STT result
  answerSeconds: number;    // actually used
  wordsSpoken: number;
}

export interface ExamSubscores {
  fluency: number;          // 0-100
  grammar: number;
  vocabulary: number;
  coherence: number;
  taskCompletion: number;
}

export interface ExamGradeResult {
  examType: ExamType;
  formId: string;
  date: string;                    // YYYY-MM-DD
  predictedGrade: string;          // 토스: "Level 6" / 오픽: "IM2" 등
  predictedScoreRange?: string;    // 토스만: "130-150"
  subscores: ExamSubscores;
  overallFeedbackKo: string;       // 종합 피드백 (한국어)
  perTaskFeedback: { taskId: string; feedbackKo: string; strong?: string; weak?: string }[];
}

/** 등급 스케일 (표시/정렬용) — 낮음→높음 순 */
export const OPIC_GRADES = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL'] as const;
export const TOEIC_SPEAKING_LEVELS = [
  { level: 'Level 3', range: '60-70' },
  { level: 'Level 4', range: '80-100' },
  { level: 'Level 5', range: '110-120' },
  { level: 'Level 6', range: '130-150' },
  { level: 'Level 7', range: '160-180' },
  { level: 'Level 8', range: '190-200' },
] as const;

// ---- API payloads ----

export interface GradeExamRequest {
  examType: ExamType;
  formId: string;
  answers: ExamAnswer[];
}

export interface GradeExamResponse {
  result: ExamGradeResult;
}

// ---- History (stats.examHistory) ----

export const MAX_EXAM_HISTORY = 20;

export type ExamHistoryItem = ExamGradeResult;
