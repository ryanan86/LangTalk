'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ActionResult {
  success?: boolean;
  results?: string[];
  errors?: string[];
  error?: string;
}

export default function AdminSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ActionResult>>({});

  const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

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
          <p className="text-neutral-400 mb-4">관리자 권한이 필요합니다.</p>
          <p className="text-neutral-500 text-sm mb-6">
            현재 로그인: {session?.user?.email || '없음'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const runAction = async (action: string) => {
    setLoading(action);
    try {
      const response = await fetch('/api/setup-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      setResults(prev => ({ ...prev, [action]: data }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [action]: { error: String(error) },
      }));
    } finally {
      setLoading(null);
    }
  };

  const actions = [
    {
      id: 'create_sheets',
      title: '1. 새 시트 생성',
      description: 'Users, LearningData, DebateTopicsV2 시트를 생성합니다.',
      color: 'blue',
    },
    {
      id: 'migrate_data',
      title: '2. 데이터 마이그레이션',
      description: '기존 Subscriptions, UserProfiles, LessonHistory, Corrections 데이터를 새 구조로 이전합니다.',
      color: 'amber',
    },
    {
      id: 'seed_topics',
      title: '3. 디베이트 토픽 시딩',
      description: '연령별 디베이트 토픽 30개를 DebateTopicsV2 시트에 추가합니다.',
      color: 'green',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-neutral-400 hover:text-white mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </button>
          <h1 className="text-3xl font-bold text-white">Admin Setup</h1>
          <p className="text-neutral-400 mt-2">Google Sheets 구조 초기화</p>
          <p className="text-neutral-500 text-sm mt-1">
            로그인: {session.user.email}
          </p>
        </div>

        <div className="space-y-4">
          {actions.map((action) => (
            <div
              key={action.id}
              className="bg-neutral-800 rounded-xl p-6 border border-neutral-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">{action.title}</h2>
                  <p className="text-neutral-400 text-sm mt-1">{action.description}</p>
                </div>
                <button
                  onClick={() => runAction(action.id)}
                  disabled={loading !== null}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${loading === action.id
                      ? 'bg-neutral-600 text-neutral-400 cursor-wait'
                      : action.color === 'blue'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : action.color === 'amber'
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                    }
                    ${loading !== null && loading !== action.id ? 'opacity-50' : ''}
                  `}
                >
                  {loading === action.id ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      실행 중...
                    </span>
                  ) : (
                    '실행'
                  )}
                </button>
              </div>

              {/* Results */}
              {results[action.id] && (
                <div className="mt-4 p-4 bg-neutral-900 rounded-lg">
                  {results[action.id].success ? (
                    <div>
                      <p className="text-green-400 font-medium flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        성공
                      </p>
                      {results[action.id].results && (
                        <ul className="mt-2 space-y-1">
                          {results[action.id].results!.map((r, i) => (
                            <li key={i} className="text-neutral-300 text-sm">• {r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-red-400 font-medium flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        실패
                      </p>
                      <p className="text-red-300 text-sm mt-1">
                        {results[action.id].error || results[action.id].errors?.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
          <h3 className="text-white font-medium mb-2">주의사항</h3>
          <ul className="text-neutral-400 text-sm space-y-1">
            <li>• 1번 → 2번 → 3번 순서로 실행하세요</li>
            <li>• 마이그레이션은 기존 데이터를 새 시트로 복사합니다 (기존 시트 유지)</li>
            <li>• 이미 실행한 작업을 다시 실행하면 중복 데이터가 생길 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
