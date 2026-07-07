'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Skeleton from '@/components/ui/Skeleton';
import type { ProviderStatus } from '@/app/api/admin/ai-status/route';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiStatusResponse {
  providers: ProviderStatus[];
  checkedAt: string;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconCpu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: ProviderStatus['status']): string {
  switch (s) {
    case 'ok':           return '정상';
    case 'low':          return '잔액 부족';
    case 'error':        return '오류';
    case 'no-permission': return '권한 없음';
    case 'info':         return '정보';
  }
}

function statusBadgeVariant(s: ProviderStatus['status']): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (s) {
    case 'ok':           return 'success';
    case 'low':          return 'warning';
    case 'error':        return 'error';
    case 'no-permission': return 'default';
    case 'info':         return 'info';
  }
}

function roleBadgeVariant(role: ProviderStatus['role']): 'info' | 'default' | 'success' {
  switch (role) {
    case 'LLM': return 'info';
    case 'TTS': return 'default';
    case 'STT': return 'success';
  }
}

function formatBalance(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function formatCheckedAt(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

// ─── Provider Card ────────────────────────────────────────────────────────────

function ProviderCard({ provider }: { provider: ProviderStatus }) {
  const isLow = provider.status === 'low';
  const hasQuota = provider.quotaLimit !== undefined && provider.quotaLimit > 0;
  const pct = hasQuota
    ? Math.round(((provider.quotaUsed ?? 0) / (provider.quotaLimit ?? 1)) * 100)
    : 0;

  return (
    <Card
      variant="default"
      padding="md"
      className={[
        'flex flex-col gap-4 dark',
        isLow ? 'ring-1 ring-amber-500/60 bg-amber-500/[0.04]' : '',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-white leading-tight">{provider.name}</span>
            <Badge variant={roleBadgeVariant(provider.role)} size="sm">{provider.role}</Badge>
          </div>
        </div>
        <Badge variant={statusBadgeVariant(provider.status)} size="md" dot>
          {statusLabel(provider.status)}
        </Badge>
      </div>

      {/* Balance / quota figure */}
      <div>
        {provider.balanceUsd !== undefined && (
          <div className="flex items-baseline gap-1.5">
            <span className={[
              'text-2xl font-bold tabular-nums',
              isLow ? 'text-amber-300' : 'text-white',
            ].join(' ')}>
              {formatBalance(provider.balanceUsd)}
            </span>
            <span className="text-xs text-neutral-400">잔액</span>
          </div>
        )}

        {hasQuota && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className={[
                'text-2xl font-bold tabular-nums',
                isLow ? 'text-amber-300' : 'text-white',
              ].join(' ')}>
                {pct}%
              </span>
              <span className="text-xs text-neutral-400">
                {(provider.quotaUsed ?? 0).toLocaleString()} / {(provider.quotaLimit ?? 0).toLocaleString()} 자
              </span>
            </div>
            <ProgressBar
              value={pct}
              variant={isLow ? 'amber' : 'emerald'}
              size="md"
              label="문자 할당량 사용률"
            />
          </div>
        )}

        {provider.balanceUsd === undefined && !hasQuota && (
          <div className="text-sm text-neutral-400">수치 정보 없음</div>
        )}
      </div>

      {/* Note */}
      {provider.note && (
        <p className={[
          'text-xs leading-relaxed',
          isLow ? 'text-amber-300/80' : 'text-neutral-400',
        ].join(' ')}>
          {provider.note}
        </p>
      )}

      {/* Dashboard link */}
      {provider.dashboardUrl && (
        <a
          href={provider.dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mt-auto pt-1 border-t border-white/[0.06]"
        >
          <IconExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          대시보드 열기
        </a>
      )}
    </Card>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function ProviderCardSkeleton() {
  return (
    <Card variant="default" padding="md" className="flex flex-col gap-4 dark">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <Skeleton width={100} height={18} />
          <Skeleton width={40} height={16} />
        </div>
        <Skeleton width={60} height={22} shape="line" />
      </div>
      <Skeleton width={80} height={32} />
      <Skeleton height={14} className="w-3/4" />
      <Skeleton height={12} className="w-1/2 mt-auto" />
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

export default function AiStatusPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async (fresh = false) => {
    setError(null);
    if (fresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = fresh ? '/api/admin/ai-status?fresh=1' : '/api/admin/ai-status';
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json() as AiStatusResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchStatus();
    }
  }, [sessionStatus, fetchStatus]);

  // ── Auth guards ────────────────────────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-400 text-sm">로딩 중...</div>
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

  // ── Counts for summary bar ─────────────────────────────────────────────────

  const lowCount = data?.providers.filter(p => p.status === 'low').length ?? 0;
  const errorCount = data?.providers.filter(p => p.status === 'error').length ?? 0;

  return (
    <div className="min-h-screen bg-neutral-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/users')}
            className="text-neutral-400 hover:text-white mb-4 flex items-center gap-2 text-sm pressable"
          >
            <IconChevronLeft className="w-4 h-4" />
            관리자로 돌아가기
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <IconCpu className="w-5 h-5 text-neutral-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI 엔진 현황</h1>
                <p className="text-sm text-neutral-400 mt-0.5">
                  {data ? `마지막 확인: ${formatCheckedAt(data.checkedAt)}` : '각 AI 공급자의 잔액 및 상태를 확인합니다'}
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-neutral-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50 pressable"
            >
              <IconRefresh className={['w-4 h-4', refreshing ? 'animate-spin' : ''].join(' ')} />
              새로고침
            </button>
          </div>
        </div>

        {/* Summary bar — shown once data loaded */}
        {data && (lowCount > 0 || errorCount > 0) && (
          <div className={[
            'mb-5 px-4 py-3 rounded-xl border text-sm flex items-center gap-3',
            lowCount > 0 || errorCount > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          ].join(' ')}>
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              {errorCount > 0 && <><strong>{errorCount}개</strong> 공급자 오류</>}
              {errorCount > 0 && lowCount > 0 && ', '}
              {lowCount > 0 && <><strong>{lowCount}개</strong> 공급자 잔액 부족</>}
              {' '}— 아래 카드를 확인하세요
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl border bg-red-500/10 border-red-500/30 text-red-300 text-sm">
            데이터 로드 실패: {error}
          </div>
        )}

        {/* Provider grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <ProviderCardSkeleton key={i} />)
            : data?.providers.map(p => <ProviderCard key={p.id} provider={p} />)
          }
        </div>

        {/* Footer note */}
        {data && (
          <p className="mt-6 text-xs text-neutral-600 text-center">
            캐시 유효 시간: 5분 — &quot;새로고침&quot; 버튼으로 즉시 갱신
          </p>
        )}
      </div>
    </div>
  );
}
