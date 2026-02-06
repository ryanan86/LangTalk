'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

interface Tutor {
  id: string;
  name: string;
  age: number;
  isKid: boolean;
  openaiVoice: string;
  elevenLabsVoice: string;
}

const TUTORS: Tutor[] = [
  { id: 'emma', name: 'Emma', age: 28, isKid: false, openaiVoice: 'shimmer', elevenLabsVoice: 'Rachel' },
  { id: 'james', name: 'James', age: 31, isKid: false, openaiVoice: 'echo', elevenLabsVoice: 'Adam' },
  { id: 'charlotte', name: 'Charlotte', age: 27, isKid: false, openaiVoice: 'fable', elevenLabsVoice: 'Dorothy' },
  { id: 'oliver', name: 'Oliver', age: 32, isKid: false, openaiVoice: 'onyx', elevenLabsVoice: 'George' },
  { id: 'alina', name: 'Alina', age: 10, isKid: true, openaiVoice: 'nova (speed 1.2)', elevenLabsVoice: 'Gigi' },
  { id: 'henly', name: 'Henly', age: 11, isKid: true, openaiVoice: 'alloy (speed 1.2)', elevenLabsVoice: 'Liam' },
];

const TEST_SENTENCES = {
  exclamation: [
    "Oh wow, that's amazing!",
    "Haha, no way!",
    "Wait, seriously?!",
    "Yay! That's so cool!",
  ],
  conversation: [
    "So what did you do after that?",
    "I totally get what you mean.",
    "That sounds really fun. Tell me more about it.",
    "Nice! So anyway, what are you up to this weekend?",
  ],
  long: [
    "You know what, I've been thinking about this a lot lately, and I think you're absolutely right about that.",
    "That's such a great point. I remember when I was younger, I used to feel the same way about things like that.",
  ],
};

export default function TTSTestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedTutor, setSelectedTutor] = useState<Tutor>(TUTORS[0]);
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState<{ openai: boolean; elevenlabs: boolean }>({
    openai: false,
    elevenlabs: false,
  });
  const [audioUrls, setAudioUrls] = useState<{ openai: string | null; elevenlabs: string | null }>({
    openai: null,
    elevenlabs: null,
  });
  const [error, setError] = useState<string | null>(null);

  const generateAudio = async (text: string, provider: 'openai' | 'elevenlabs') => {
    setLoading(prev => ({ ...prev, [provider]: true }));
    setError(null);

    // Revoke previous URL
    if (audioUrls[provider]) {
      URL.revokeObjectURL(audioUrls[provider]!);
    }

    try {
      const response = await fetch('/api/tts-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          tutorId: selectedTutor.id,
          provider,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate audio');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrls(prev => ({ ...prev, [provider]: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating audio');
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  };

  const generateBoth = async (text: string) => {
    await Promise.all([
      generateAudio(text, 'openai'),
      generateAudio(text, 'elevenlabs'),
    ]);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-neutral-400">관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/users')}
            className="text-neutral-400 hover:text-white mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            관리자로 돌아가기
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">TTS 비교 테스트</h1>
          <p className="text-neutral-400 mt-1">OpenAI vs ElevenLabs 음성 품질 비교</p>
        </div>

        {/* Tutor Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">튜터 선택</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {TUTORS.map(tutor => (
              <button
                key={tutor.id}
                onClick={() => {
                  setSelectedTutor(tutor);
                  setAudioUrls({ openai: null, elevenlabs: null });
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedTutor.id === tutor.id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <div className="font-medium">{tutor.name}</div>
                <div className="text-xs opacity-70">{tutor.age}세 {tutor.isKid ? '(아이)' : ''}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Tutor Info */}
        <div className="mb-6 p-4 bg-neutral-800 rounded-xl border border-neutral-700">
          <h3 className="text-white font-medium mb-2">{selectedTutor.name} 목소리 정보</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-400">OpenAI:</span>{' '}
              <span className="text-blue-400">{selectedTutor.openaiVoice}</span>
            </div>
            <div>
              <span className="text-neutral-400">ElevenLabs:</span>{' '}
              <span className="text-purple-400">{selectedTutor.elevenLabsVoice}</span>
            </div>
          </div>
          {selectedTutor.isKid && (
            <p className="text-amber-400 text-xs mt-2">
              * 아이 튜터: ElevenLabs가 더 자연스러울 가능성 높음
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Test Sentences */}
        <div className="space-y-6">
          {/* Exclamations */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">짧은 감탄사 테스트</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEST_SENTENCES.exclamation.map((sentence, idx) => (
                <button
                  key={idx}
                  onClick={() => generateBoth(sentence)}
                  disabled={loading.openai || loading.elevenlabs}
                  className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-left hover:bg-neutral-700 disabled:opacity-50 transition-all"
                >
                  <span className="text-white">&ldquo;{sentence}&rdquo;</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">일반 대화 테스트</h2>
            <div className="grid grid-cols-1 gap-2">
              {TEST_SENTENCES.conversation.map((sentence, idx) => (
                <button
                  key={idx}
                  onClick={() => generateBoth(sentence)}
                  disabled={loading.openai || loading.elevenlabs}
                  className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-left hover:bg-neutral-700 disabled:opacity-50 transition-all"
                >
                  <span className="text-white">&ldquo;{sentence}&rdquo;</span>
                </button>
              ))}
            </div>
          </div>

          {/* Long sentences */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">긴 문장 테스트</h2>
            <div className="grid grid-cols-1 gap-2">
              {TEST_SENTENCES.long.map((sentence, idx) => (
                <button
                  key={idx}
                  onClick={() => generateBoth(sentence)}
                  disabled={loading.openai || loading.elevenlabs}
                  className="p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-left hover:bg-neutral-700 disabled:opacity-50 transition-all"
                >
                  <span className="text-white text-sm">&ldquo;{sentence}&rdquo;</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Text */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">커스텀 텍스트</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="테스트할 문장 입력..."
                className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
              <button
                onClick={() => customText && generateBoth(customText)}
                disabled={!customText || loading.openai || loading.elevenlabs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 font-medium"
              >
                생성
              </button>
            </div>
          </div>
        </div>

        {/* Audio Players */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OpenAI Player */}
          <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-blue-400 font-semibold">OpenAI TTS</h3>
              {loading.openai && (
                <span className="text-blue-400 text-sm animate-pulse">생성 중...</span>
              )}
            </div>
            <div className="text-xs text-blue-300/70 mb-2">
              Voice: {selectedTutor.openaiVoice}
            </div>
            {audioUrls.openai ? (
              <audio controls className="w-full" src={audioUrls.openai}>
                Your browser does not support audio.
              </audio>
            ) : (
              <div className="h-12 bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-400/50 text-sm">
                문장을 선택하면 여기서 재생됩니다
              </div>
            )}
            <div className="mt-2 text-xs text-blue-300/50">
              비용: $0.015 / 1,000자
            </div>
          </div>

          {/* ElevenLabs Player */}
          <div className="p-4 bg-purple-900/30 border border-purple-700/50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-purple-400 font-semibold">ElevenLabs TTS</h3>
              {loading.elevenlabs && (
                <span className="text-purple-400 text-sm animate-pulse">생성 중...</span>
              )}
            </div>
            <div className="text-xs text-purple-300/70 mb-2">
              Voice: {selectedTutor.elevenLabsVoice}
            </div>
            {audioUrls.elevenlabs ? (
              <audio controls className="w-full" src={audioUrls.elevenlabs}>
                Your browser does not support audio.
              </audio>
            ) : (
              <div className="h-12 bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-400/50 text-sm">
                문장을 선택하면 여기서 재생됩니다
              </div>
            )}
            <div className="mt-2 text-xs text-purple-300/50">
              비용: ~$0.22 / 1,000자 (Creator 플랜 기준)
            </div>
          </div>
        </div>

        {/* Comparison Guide */}
        <div className="mt-8 p-4 bg-neutral-800 rounded-xl border border-neutral-700">
          <h3 className="text-white font-semibold mb-3">비교 포인트</h3>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">1.</span>
              <span><strong>자연스러움:</strong> 억양과 발음이 자연스러운가?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">2.</span>
              <span><strong>감정 표현:</strong> 감탄사에서 감정이 느껴지는가?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">3.</span>
              <span><strong>캐릭터 적합성:</strong> {selectedTutor.name}({selectedTutor.age}세)에 어울리는 목소리인가?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">4.</span>
              <span><strong>이질감:</strong> 서비스에서 사용해도 어색하지 않을 정도인가?</span>
            </li>
          </ul>
        </div>

        {/* Decision Helper */}
        <div className="mt-6 p-4 bg-amber-900/30 border border-amber-700/50 rounded-xl">
          <h3 className="text-amber-400 font-semibold mb-2">판단 가이드</h3>
          <div className="text-sm text-amber-200/80 space-y-1">
            <p>• 차이가 거의 없음 → <strong>OpenAI 사용 (비용 절감)</strong></p>
            <p>• 차이 있지만 수용 가능 → <strong>하이브리드 (아이만 ElevenLabs)</strong></p>
            <p>• 차이가 큼, 이질감 심함 → <strong>ElevenLabs 유지</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
