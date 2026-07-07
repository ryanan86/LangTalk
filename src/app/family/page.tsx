'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge, Modal, Skeleton } from '@/components/ui';
import BottomNav from '@/components/BottomNav';
import { MAX_FAMILY_MEMBERS } from '@/lib/plans';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemberStats {
  currentStreak: number;
  studyStreak: number;
  totalSpokenSentences: number;
  wordsLearned: number;
  cefr: string;
  lastActiveDate: string | null;
}

interface FamilyMember {
  email: string;
  name: string;
  joinedAt?: string;
  stats: MemberStats;
}

interface FamilyData {
  role: 'owner' | 'member' | null;
  plan?: string;
  expiryDate?: string;
  ownerEmail?: string;
  maxMembers: number;
  members?: FamilyMember[];
}

// ── SVG icons (no emoji) ───────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function PersonPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return '활동 없음';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function planLabel(plan?: string): string {
  if (plan === 'family-monthly') return '가족 월간';
  if (plan === 'family-yearly') return '가족 연간';
  return plan ?? '가족 플랜';
}

function cefrVariant(cefr: string): 'info' | 'success' | 'warning' | 'default' {
  if (['C1', 'C2'].includes(cefr)) return 'success';
  if (['B1', 'B2'].includes(cefr)) return 'info';
  if (['A1', 'A2'].includes(cefr)) return 'warning';
  return 'default';
}

// ── Skeleton layout ────────────────────────────────────────────────────────────

function FamilyPageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="p-5 rounded-card-lg bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-3">
        <Skeleton shape="line" width="40%" />
        <Skeleton shape="line" width="60%" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="p-5 rounded-card-lg bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton shape="line" width="50%" />
              <Skeleton shape="line" width="70%" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} shape="rect" height={56} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Member card ────────────────────────────────────────────────────────────────

function MemberCard({
  member,
  isOwner,
  onRemove,
}: {
  member: FamilyMember;
  isOwner: boolean;
  onRemove: (email: string) => void;
}) {
  const { stats } = member;
  const initials = member.name
    ? member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : member.email[0].toUpperCase();

  return (
    <div className="p-5 rounded-card-lg bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] motion-safe:animate-ds-scale-in">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{member.name || member.email}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{member.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stats.cefr && (
            <Badge variant={cefrVariant(stats.cefr)} size="sm">
              {stats.cefr}
            </Badge>
          )}
          {isOwner && (
            <button
              onClick={() => onRemove(member.email)}
              className="pressable p-1.5 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              aria-label={`${member.name || member.email} 멤버 제거`}
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col items-center p-2.5 rounded-card bg-neutral-50 dark:bg-white/[0.04] border border-neutral-100 dark:border-white/[0.04]">
          <FireIcon className="w-4 h-4 text-orange-500 mb-1" />
          <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">{stats.currentStreak}</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">연속</span>
        </div>
        <div className="flex flex-col items-center p-2.5 rounded-card bg-neutral-50 dark:bg-white/[0.04] border border-neutral-100 dark:border-white/[0.04]">
          <svg className="w-4 h-4 text-violet-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">{stats.studyStreak}</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">스터디</span>
        </div>
        <div className="flex flex-col items-center p-2.5 rounded-card bg-neutral-50 dark:bg-white/[0.04] border border-neutral-100 dark:border-white/[0.04]">
          <ChatIcon className="w-4 h-4 text-sky-500 mb-1" />
          <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">{stats.totalSpokenSentences}</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">발화</span>
        </div>
        <div className="flex flex-col items-center p-2.5 rounded-card bg-neutral-50 dark:bg-white/[0.04] border border-neutral-100 dark:border-white/[0.04]">
          <BookOpenIcon className="w-4 h-4 text-emerald-500 mb-1" />
          <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">{stats.wordsLearned}</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">단어</span>
        </div>
      </div>

      {/* Last active */}
      <div className="flex items-center gap-1.5 mt-3">
        <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          마지막 활동: <span className="font-medium">{formatLastActive(stats.lastActiveDate)}</span>
        </span>
      </div>
    </div>
  );
}

// ── Empty slot card ────────────────────────────────────────────────────────────

function EmptySlotCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="pressable w-full p-5 rounded-card-lg border-2 border-dashed border-neutral-200 dark:border-white/[0.10] bg-neutral-50 dark:bg-white/[0.02] hover:border-violet-300 dark:hover:border-violet-500/40 hover:bg-violet-50/50 dark:hover:bg-violet-500/5 transition-all group"
    >
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-white/[0.06] group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20 flex items-center justify-center transition-colors">
          <PersonPlusIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
        </div>
        <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          가족 초대
        </span>
      </div>
    </button>
  );
}

// ── Add member form ────────────────────────────────────────────────────────────

function AddMemberForm({
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  onSubmit: (email: string) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="p-5 rounded-card-lg bg-white dark:bg-white/[0.03] border-2 border-violet-300 dark:border-violet-500/50 motion-safe:animate-ds-scale-in space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <PersonPlusIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        <p className="font-semibold text-neutral-900 dark:text-white text-sm">가족 구성원 초대</p>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
        초대할 가족이 먼저 탭톡에 가입되어 있어야 해요. 가입한 계정의 이메일을 입력해 주세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 h-10 px-3 rounded-2xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] focus-within:border-violet-500 dark:focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
          <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="family@example.com"
            className="flex-1 min-w-0 h-full bg-transparent text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none"
            required
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 motion-safe:animate-fade-up">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="pressable flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="pressable flex-1 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                초대 중...
              </span>
            ) : '초대하기'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FamilyPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Add member state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove member state
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Leave family state (member)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchFamily();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  const fetchFamily = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/family');
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const data = await res.json();
      setFamilyData(data);
    } catch (e) {
      setFetchError((e as Error).message || '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (email: string) => {
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch('/api/family/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || '초대에 실패했습니다');
        return;
      }
      // Refresh family data
      await fetchFamily();
      setShowAddForm(false);
    } catch {
      setAddError('네트워크 오류가 발생했습니다');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    setRemoveLoading(true);
    try {
      const res = await fetch('/api/family/member', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        await fetchFamily();
      }
    } catch {
      // silent
    } finally {
      setRemoveLoading(false);
      setRemoveTarget(null);
    }
  };

  const handleLeaveFamily = async () => {
    if (!session?.user?.email) return;
    setLeaveLoading(true);
    try {
      const res = await fetch('/api/family/member', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email }),
      });
      if (res.ok) {
        await fetchFamily();
        setShowLeaveConfirm(false);
      }
    } catch {
      // silent
    } finally {
      setLeaveLoading(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] px-4 py-4 sticky top-0 z-50 safe-top">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="p-2 -ml-2">
              <Skeleton shape="circle" width={24} height={24} />
            </div>
            <Skeleton shape="line" width={100} height={20} />
            <div className="w-8" />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-8 pb-24">
          <FamilyPageSkeleton />
        </main>
        <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        <BottomNav />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Header onBack={() => router.back()} />
        <main className="max-w-lg mx-auto px-4 py-8 pb-24">
          <div className="p-5 rounded-card-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-center">
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">{fetchError}</p>
            <button
              onClick={fetchFamily}
              className="pressable px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </main>
        <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        <BottomNav />
      </div>
    );
  }

  const role = familyData?.role ?? null;

  // ── role null: upsell ────────────────────────────────────────────────────────
  if (role === null) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Header onBack={() => router.back()} />
        <main className="max-w-lg mx-auto px-4 py-8 pb-24 space-y-6 motion-safe:animate-fade-up">
          {/* Hero */}
          <div className="p-6 rounded-card-lg bg-brand-gradient text-white relative overflow-hidden">
            <div aria-hidden="true" className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden="true" className="absolute -bottom-16 -left-6 w-36 h-36 rounded-full bg-indigo-400/20 blur-2xl" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <UsersIcon className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-display-2 font-display font-extrabold mb-2">가족 플랜</h2>
              <p className="text-white/80 text-sm leading-relaxed">
                온 가족이 함께 영어를 배우는 가장 스마트한 방법. 최대 4인이 각자의 플랜으로, 한 번의 결제로.
              </p>
            </div>
          </div>

          {/* Value props */}
          <div className="space-y-3">
            {[
              { icon: <UsersIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />, title: '최대 4인 동시 이용', desc: '부모와 자녀 모두 하나의 결제로 함께 이용하세요' },
              { icon: <LinkIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />, title: '부모 대시보드', desc: '자녀의 학습 현황과 진도를 한 눈에 확인' },
              { icon: <BookOpenIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />, title: '각자의 맞춤 학습', desc: '개인별 AI 튜터와 개인 플랜으로 최적화된 학습' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-card bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white text-sm">{title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/subscribe?tab=family')}
            className="pressable w-full py-4 rounded-2xl bg-brand-gradient text-white font-bold text-base shadow-float dark:shadow-float-dark motion-safe:animate-gentle-bounce"
          >
            가족 플랜 시작하기
          </button>

          <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
            월 ₩19,900부터 · 최대 4인 · 자동 갱신 없음
          </p>
        </main>
        <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        <BottomNav />
      </div>
    );
  }

  // ── role member ──────────────────────────────────────────────────────────────
  if (role === 'member') {
    const expiry = familyData?.expiryDate ? new Date(familyData.expiryDate) : null;
    const remainingDays = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Header onBack={() => router.back()} />
        <main className="max-w-lg mx-auto px-4 py-8 pb-24 space-y-5 motion-safe:animate-fade-up">

          {/* Linked state card */}
          <div className="p-5 rounded-card-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <LinkIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-bold text-violet-900 dark:text-violet-200 text-sm">
                      가족 플랜으로 이용 중
                    </p>
                    {familyData?.ownerEmail && (
                      <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5 truncate max-w-[200px]">
                        운영자: {familyData.ownerEmail}
                      </p>
                    )}
                  </div>
                  {familyData?.plan && (
                    <Badge variant="info" size="sm">
                      {planLabel(familyData.plan)}
                    </Badge>
                  )}
                </div>
                {expiry && (
                  <p className="text-xs text-violet-700/80 dark:text-violet-400/70 mt-2">
                    만료일: <span className="font-semibold">{expiry.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {' '}
                    <Badge variant="success" size="sm" className="ml-1 motion-safe:animate-count-pop">{remainingDays}일 남음</Badge>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 나가기 */}
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="pressable w-full flex items-center gap-3 p-4 rounded-card bg-white dark:bg-white/[0.03] border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-red-600 dark:text-red-400 block text-sm">가족 플랜 나가기</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500 block">가족 플랜에서 탈퇴하고 개인 계정으로 전환됩니다</span>
            </div>
          </button>

        </main>

        {/* Leave confirm modal */}
        <Modal
          open={showLeaveConfirm}
          onClose={() => setShowLeaveConfirm(false)}
          title="가족 플랜 나가기"
          actions={
            <>
              <button
                onClick={handleLeaveFamily}
                disabled={leaveLoading}
                className="pressable w-full py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {leaveLoading ? '처리 중...' : '나가기'}
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaveLoading}
                className="pressable w-full py-3 rounded-xl border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
              >
                취소
              </button>
            </>
          }
        >
          가족 플랜에서 나가면 프리미엄 이용이 종료됩니다. 계속하시겠습니까?
        </Modal>

        <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
        <BottomNav />
      </div>
    );
  }

  // ── role owner ───────────────────────────────────────────────────────────────
  const members = familyData?.members ?? [];
  const emptySlots = Math.max(0, MAX_FAMILY_MEMBERS - members.length);
  const expiry = familyData?.expiryDate ? new Date(familyData.expiryDate) : null;
  const remainingDays = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header onBack={() => router.back()} />

      <main className="max-w-lg mx-auto px-4 py-8 pb-24 space-y-5 motion-safe:animate-fade-up">

        {/* ── Status header ──────────────────────────────────────────────────── */}
        <div className="p-5 rounded-card-lg bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="font-bold text-neutral-900 dark:text-white text-sm">가족 현황</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{members.length} / {MAX_FAMILY_MEMBERS}명 이용 중</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {familyData?.plan && (
                <Badge variant="info" size="md">
                  {planLabel(familyData.plan)}
                </Badge>
              )}
              {expiry && (
                <Badge variant="success" size="md" dot className="motion-safe:animate-count-pop tabular-nums">
                  {remainingDays}일 남음
                </Badge>
              )}
            </div>
          </div>
          {expiry && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
              만료일: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{expiry.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </p>
          )}
        </div>

        {/* ── Member cards ───────────────────────────────────────────────────── */}
        {members.map((member) => (
          <MemberCard
            key={member.email}
            member={member}
            isOwner
            onRemove={(email) => setRemoveTarget(email)}
          />
        ))}

        {/* ── Add member form or empty slots ─────────────────────────────────── */}
        {showAddForm ? (
          <AddMemberForm
            onSubmit={handleAddMember}
            onCancel={() => { setShowAddForm(false); setAddError(null); }}
            loading={addLoading}
            error={addError}
          />
        ) : (
          emptySlots > 0 && (
            <div className="space-y-3">
              {Array.from({ length: emptySlots }).map((_, i) => (
                <EmptySlotCard key={i} onAdd={() => { setShowAddForm(true); setAddError(null); }} />
              ))}
            </div>
          )
        )}

      </main>

      {/* Remove member confirm modal */}
      <Modal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="구성원 제거"
        actions={
          <>
            <button
              onClick={() => removeTarget && handleRemoveMember(removeTarget)}
              disabled={removeLoading}
              className="pressable w-full py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {removeLoading ? '처리 중...' : '제거하기'}
            </button>
            <button
              onClick={() => setRemoveTarget(null)}
              disabled={removeLoading}
              className="pressable w-full py-3 rounded-xl border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
            >
              취소
            </button>
          </>
        }
      >
        {removeTarget && (
          <span><span className="font-semibold">{removeTarget}</span> 님을 가족 플랜에서 제거합니다. 해당 멤버의 프리미엄 이용이 종료됩니다.</span>
        )}
      </Modal>

      <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      <BottomNav />
    </div>
  );
}

// ── Shared header ─────────────────────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] px-4 py-4 sticky top-0 z-50 safe-top">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button
          onClick={onBack}
          className="pressable p-2 -ml-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          aria-label="뒤로가기"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-base font-semibold text-neutral-900 dark:text-white">가족 플랜</h1>
        <div className="w-8" />
      </div>
    </header>
  );
}
