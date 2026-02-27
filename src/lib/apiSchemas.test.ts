import { describe, it, expect, vi } from 'vitest';

// Mock next/server before importing the module under test
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({ _isMock: true, body, init })),
  },
}));

import {
  chatBodySchema,
  userProfileBodySchema,
  lessonHistoryBodySchema,
  correctionReviewBodySchema,
  ttsBodySchema,
  vocabBookPostBodySchema,
  correctionsPostBodySchema,
  parseBody,
} from './apiSchemas';

// ===== chatBodySchema =====

describe('chatBodySchema', () => {
  const validChatBody = {
    messages: [{ role: 'user', content: 'Hello' }],
    tutorId: 'emma',
  };

  it('accepts a valid minimal chat body', () => {
    const result = chatBodySchema.safeParse(validChatBody);
    expect(result.success).toBe(true);
  });

  it('defaults language to "en"', () => {
    const result = chatBodySchema.safeParse(validChatBody);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.language).toBe('en');
  });

  it('defaults stream to false', () => {
    const result = chatBodySchema.safeParse(validChatBody);
    if (result.success) expect(result.data.stream).toBe(false);
  });

  it('rejects empty messages array', () => {
    const result = chatBodySchema.safeParse({ ...validChatBody, messages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing tutorId', () => {
    const result = chatBodySchema.safeParse({ messages: validChatBody.messages });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role in messages', () => {
    const result = chatBodySchema.safeParse({
      ...validChatBody,
      messages: [{ role: 'system', content: 'Hi' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty content in messages', () => {
    const result = chatBodySchema.safeParse({
      ...validChatBody,
      messages: [{ role: 'user', content: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = chatBodySchema.safeParse({
      ...validChatBody,
      birthYear: 1990,
      userName: 'Test User',
      mode: 'feedback',
      stream: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid mode value', () => {
    const result = chatBodySchema.safeParse({ ...validChatBody, mode: 'invalid-mode' });
    expect(result.success).toBe(false);
  });

  it('rejects birthYear out of range', () => {
    const result = chatBodySchema.safeParse({ ...validChatBody, birthYear: 1800 });
    expect(result.success).toBe(false);
  });
});

// ===== userProfileBodySchema =====

describe('userProfileBodySchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = userProfileBodySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid profileType', () => {
    const result = userProfileBodySchema.safeParse({ profileType: 'adult_intermediate' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid profileType', () => {
    const result = userProfileBodySchema.safeParse({ profileType: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts valid correctionLevel 1-4', () => {
    for (const level of [1, 2, 3, 4] as const) {
      const result = userProfileBodySchema.safeParse({ correctionLevel: level });
      expect(result.success).toBe(true);
    }
  });

  it('rejects correctionLevel 5', () => {
    const result = userProfileBodySchema.safeParse({ correctionLevel: 5 });
    expect(result.success).toBe(false);
  });

  it('accepts valid schedule object', () => {
    const result = userProfileBodySchema.safeParse({
      schedule: {
        enabled: true,
        times: ['09:00', '18:00'],
        days: [1, 2, 3, 4, 5],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid time format in schedule', () => {
    const result = userProfileBodySchema.safeParse({
      schedule: {
        enabled: true,
        times: ['9am'],
        days: [1],
      },
    });
    expect(result.success).toBe(false);
  });
});

// ===== lessonHistoryBodySchema =====

describe('lessonHistoryBodySchema', () => {
  it('accepts empty object (all optional)', () => {
    const result = lessonHistoryBodySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid full object', () => {
    const result = lessonHistoryBodySchema.safeParse({
      tutor: 'emma',
      duration: 300,
      level: 'B1',
      topicSummary: 'We talked about travel.',
      feedbackSummary: 'Great session!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects duration over 3600', () => {
    const result = lessonHistoryBodySchema.safeParse({ duration: 9999 });
    expect(result.success).toBe(false);
  });

  it('accepts valid levelDetails', () => {
    const result = lessonHistoryBodySchema.safeParse({
      levelDetails: { grammar: 7, vocabulary: 8, fluency: 6, comprehension: 9 },
    });
    expect(result.success).toBe(true);
  });
});

// ===== correctionReviewBodySchema =====

describe('correctionReviewBodySchema', () => {
  it('accepts valid correctionId and quality', () => {
    const result = correctionReviewBodySchema.safeParse({ correctionId: 'abc123', quality: 3 });
    expect(result.success).toBe(true);
  });

  it('rejects missing correctionId', () => {
    const result = correctionReviewBodySchema.safeParse({ quality: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects quality outside 0-5', () => {
    expect(correctionReviewBodySchema.safeParse({ correctionId: 'x', quality: 6 }).success).toBe(false);
    expect(correctionReviewBodySchema.safeParse({ correctionId: 'x', quality: -1 }).success).toBe(false);
  });

  it('rejects non-integer quality', () => {
    const result = correctionReviewBodySchema.safeParse({ correctionId: 'x', quality: 2.5 });
    expect(result.success).toBe(false);
  });
});

// ===== ttsBodySchema =====

describe('ttsBodySchema', () => {
  it('accepts valid TTS body', () => {
    const result = ttsBodySchema.safeParse({ text: 'Hello world', voice: 'alloy' });
    expect(result.success).toBe(true);
  });

  it('rejects empty text', () => {
    const result = ttsBodySchema.safeParse({ text: '', voice: 'alloy' });
    expect(result.success).toBe(false);
  });

  it('rejects missing voice', () => {
    const result = ttsBodySchema.safeParse({ text: 'Hello' });
    expect(result.success).toBe(false);
  });

  it('accepts valid speed within range', () => {
    const result = ttsBodySchema.safeParse({ text: 'Hi', voice: 'nova', speed: 1.5 });
    expect(result.success).toBe(true);
  });

  it('rejects speed below 0.5', () => {
    const result = ttsBodySchema.safeParse({ text: 'Hi', voice: 'nova', speed: 0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects speed above 2.0', () => {
    const result = ttsBodySchema.safeParse({ text: 'Hi', voice: 'nova', speed: 3 });
    expect(result.success).toBe(false);
  });
});

// ===== correctionsPostBodySchema =====

describe('correctionsPostBodySchema', () => {
  const validItem = {
    original: 'I goed to school',
    corrected: 'I went to school',
  };

  it('accepts a single correction item', () => {
    const result = correctionsPostBodySchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it('accepts an array of correction items', () => {
    const result = correctionsPostBodySchema.safeParse([validItem, validItem]);
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = correctionsPostBodySchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('defaults category to grammar when omitted', () => {
    const result = correctionsPostBodySchema.safeParse(validItem);
    if (result.success && !Array.isArray(result.data)) {
      expect(result.data.category).toBe('grammar');
    }
  });
});

// ===== parseBody helper =====

describe('parseBody', () => {
  it('returns success:true with parsed data on valid input', () => {
    const result = parseBody(ttsBodySchema, { text: 'Hello', voice: 'alloy' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe('Hello');
      expect(result.data.voice).toBe('alloy');
    }
  });

  it('returns success:false with response on invalid input', () => {
    const result = parseBody(ttsBodySchema, { text: '', voice: 'alloy' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response).toBeDefined();
    }
  });

  it('returns 400 status on validation failure', () => {
    const result = parseBody(ttsBodySchema, { text: '', voice: 'alloy' }) as any;
    expect(result.success).toBe(false);
    // Our mock returns { _isMock: true, body, init }
    expect(result.response.init?.status).toBe(400);
  });

  it('includes error details in failure response body', () => {
    const result = parseBody(ttsBodySchema, {}) as any;
    expect(result.success).toBe(false);
    expect(result.response.body?.error).toBe('Validation failed');
    expect(typeof result.response.body?.details).toBe('string');
  });

  it('works with chatBodySchema for a valid body', () => {
    const result = parseBody(chatBodySchema, {
      messages: [{ role: 'user', content: 'Hi' }],
      tutorId: 'emma',
    });
    expect(result.success).toBe(true);
  });
});
