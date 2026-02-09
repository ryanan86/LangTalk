'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TapTalkLogo from '@/components/TapTalkLogo';

type TimeRange = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  // GA Property ID (numeric) for embed - extract from measurement ID if possible
  // For GA4 embed reports, we need the property ID
  const GA_PROPERTY_ID = process.env.NEXT_PUBLIC_GA_PROPERTY_ID;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/users')}
              className="text-neutral-500 hover:text-neutral-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <TapTalkLogo size="sm" />
            <h1 className="text-lg font-bold text-neutral-900">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {range === '7d' ? '7일' : range === '30d' ? '30일' : '90일'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* GA Status */}
        {!GA_MEASUREMENT_ID ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Google Analytics 미설정</h2>
            <p className="text-yellow-700 text-sm mb-4">
              Google Analytics를 연동하려면 환경변수를 설정해주세요.
            </p>
            <div className="bg-yellow-100 rounded-lg p-4 font-mono text-sm text-yellow-900">
              <p># .env.local 에 추가</p>
              <p>NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX</p>
              <p># (선택) 임베드 리포트용</p>
              <p>NEXT_PUBLIC_GA_PROPERTY_ID=123456789</p>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <p className="text-sm text-neutral-500 mb-1">추적 ID</p>
                <p className="text-lg font-bold text-neutral-900">{GA_MEASUREMENT_ID}</p>
                <p className="text-xs text-green-600 mt-1">● 활성</p>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <p className="text-sm text-neutral-500 mb-1">기간</p>
                <p className="text-lg font-bold text-neutral-900">
                  {timeRange === '7d' ? '최근 7일' : timeRange === '30d' ? '최근 30일' : '최근 90일'}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <p className="text-sm text-neutral-500 mb-1">GA4 대시보드</p>
                <a
                  href={`https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID || ''}/reports/intelligenthome`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  열기 →
                </a>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <p className="text-sm text-neutral-500 mb-1">실시간</p>
                <a
                  href={`https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID || ''}/reports/realtime`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  실시간 보기 →
                </a>
              </div>
            </div>

            {/* GA Dashboard Links */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">GA4 대시보드</h2>
              <p className="text-sm text-neutral-500 mb-4">
                Google Analytics는 보안 정책상 iframe 임베드가 불가합니다. 아래 링크로 직접 접속해주세요.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={GA_PROPERTY_ID
                    ? `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/intelligenthome`
                    : 'https://analytics.google.com/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
                >
                  GA4 대시보드 열기
                </a>
                <a
                  href={GA_PROPERTY_ID
                    ? `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/realtime`
                    : 'https://analytics.google.com/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
                >
                  실시간 리포트
                </a>
              </div>
              {!GA_PROPERTY_ID && (
                <p className="text-xs text-neutral-400 mt-3">
                  Tip: <code className="bg-neutral-100 px-1 rounded">NEXT_PUBLIC_GA_PROPERTY_ID</code> 를 설정하면 직접 링크가 더 정확해집니다.
                </p>
              )}
            </div>

            {/* Looker Studio Guide */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">임베드 리포트 (Looker Studio)</h2>
              <p className="text-sm text-neutral-500 mb-3">
                GA4 데이터를 이 페이지에서 직접 보려면 Looker Studio 리포트를 생성 후 임베드하세요.
              </p>
              <ol className="text-sm text-neutral-600 space-y-2 list-decimal list-inside">
                <li><a href="https://lookerstudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Looker Studio</a> 에서 새 리포트 생성</li>
                <li>데이터 소스로 Google Analytics 4 연결</li>
                <li>원하는 차트(방문자, 국가, 디바이스 등) 추가</li>
                <li>공유 → 임베드 → URL 복사</li>
                <li>이 페이지 코드에 Looker Studio iframe URL 추가</li>
              </ol>
            </div>

            {/* Key Metrics Guide */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">주요 지표 가이드</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-medium text-neutral-800 mb-1 flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> 방문자 수</h3>
                  <p className="text-sm text-neutral-600">일/주/월별 활성 사용자 수. 서비스 성장 지표.</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-medium text-neutral-800 mb-1 flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> 국가별 접속</h3>
                  <p className="text-sm text-neutral-600">어느 국가에서 접속하는지. 글로벌 확장 지표.</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-medium text-neutral-800 mb-1 flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> 디바이스 분류</h3>
                  <p className="text-sm text-neutral-600">모바일/데스크탑/태블릿 비율. UX 우선순위 결정.</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-medium text-neutral-800 mb-1 flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> 페이지별 조회수</h3>
                  <p className="text-sm text-neutral-600">인기 페이지와 이탈 지점 파악.</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-medium text-neutral-800 mb-1 flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 평균 세션 시간</h3>
                  <p className="text-sm text-neutral-600">사용자 참여도 측정. 길수록 좋은 서비스.</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <h3 className="font-medium text-neutral-800 mb-1 flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> 전환율</h3>
                  <p className="text-sm text-neutral-600">방문 → 회원가입 → 세션 시작 비율.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
