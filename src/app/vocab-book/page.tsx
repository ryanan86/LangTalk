'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import BottomNav from '@/components/BottomNav';
import { Card, Badge, ProgressBar, Skeleton } from '@/components/ui';

interface VocabBookItem {
  id: string;
  term: string;
  sourceSentence?: string;
  sourceSessionId?: string;
  sourceDate: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  proficiency: number;
  nextReviewAt: string;
  reviewCount: number;
  status: 'active' | 'mastered' | 'archived';
}

interface VocabBookResponse {
  items: VocabBookItem[];
  total: number;
  todayCount: number;
  dueToday: number;
  masteredCount: number;
}

type TabType = 'all' | 'today' | 'due' | 'mastered';

// Difficulty label map
const difficultyLabel = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];
const difficultyLabelKo = ['', '입문', '초급', '중급', '고급', '최고급'];

export default function VocabBookPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [items, setItems] = useState<VocabBookItem[]>([]);
  const [stats, setStats] = useState({ total: 0, todayCount: 0, dueToday: 0, masteredCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<'auth' | 'error' | null>(null);

  const tabs: { key: TabType; labelKo: string; labelEn: string; countKey: keyof typeof stats | null }[] = [
    { key: 'all', labelKo: '전체', labelEn: 'All', countKey: 'total' },
    { key: 'today', labelKo: '오늘', labelEn: 'Today', countKey: 'todayCount' },
    { key: 'due', labelKo: '복습', labelEn: 'Due', countKey: 'dueToday' },
    { key: 'mastered', labelKo: '마스터', labelEn: 'Mastered', countKey: 'masteredCount' },
  ];

  useEffect(() => {
    const loadVocab = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const scope = activeTab === 'mastered' ? 'mastered' : activeTab;
        const limit = activeTab === 'today' ? 20 : 200;
        const response = await fetch(`/api/vocab-book?scope=${scope}&limit=${limit}`);
        if (!response.ok) {
          setLoadError(response.status === 401 ? 'auth' : 'error');
          setItems([]);
          return;
        }
        const data: VocabBookResponse = await response.json();
        setItems(data.items || []);
        setStats({
          total: data.total ?? 0,
          todayCount: data.todayCount ?? 0,
          dueToday: data.dueToday ?? 0,
          masteredCount: data.masteredCount ?? 0,
        });
      } catch (error) {
        console.error('Failed to load vocab book:', error);
        setLoadError('error');
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadVocab();
  }, [activeTab]);

  // Proficiency tier → ProgressBar variant
  const proficiencyVariant = (pct: number): 'emerald' | 'amber' | 'brand' =>
    pct >= 80 ? 'emerald' : pct >= 40 ? 'amber' : 'brand';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        className="px-4 sm:px-6 pb-4 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-b border-neutral-200 dark:border-white/[0.06] sticky top-0 z-40"
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="뒤로 가기"
            className="pressable w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/[0.10] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
            {language === 'ko' ? '단어장' : 'Vocab Book'}
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 space-y-5">

        {/* ─── Stat cards ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 motion-safe:animate-fade-up">
          <Card variant="default" padding="md">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              {language === 'ko' ? '전체 단어' : 'Total'}
            </p>
            <p className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">{stats.total}</p>
          </Card>
          <Card variant="default" padding="md">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              {language === 'ko' ? '오늘 추가' : 'Today'}
            </p>
            <p className="text-2xl font-extrabold text-primary-500 dark:text-primary-400 tabular-nums">{stats.todayCount}</p>
          </Card>
          <Card variant="default" padding="md">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              {language === 'ko' ? '복습 필요' : 'Due'}
            </p>
            <p className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 tabular-nums">{stats.dueToday}</p>
          </Card>
          <Card variant="default" padding="md">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              {language === 'ko' ? '마스터' : 'Mastered'}
            </p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.masteredCount}</p>
          </Card>
        </section>

        {/* ─── Filter pill tabs ────────────────────────────────────────────── */}
        <div
          role="tablist"
          aria-label={language === 'ko' ? '단어 필터' : 'Word filter'}
          className="flex gap-2 overflow-x-auto pb-0.5 motion-safe:animate-fade-up"
          style={{ animationDelay: '60ms' }}
        >
          {tabs.map((tab) => {
            const count = tab.countKey ? stats[tab.countKey] : null;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`pressable flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-primary-500 dark:bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-white dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.06] hover:border-primary-200 dark:hover:border-primary-500/30 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                {language === 'ko' ? tab.labelKo : tab.labelEn}
                {count !== null && count > 0 && (
                  <span className={`text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-neutral-100 dark:bg-white/[0.08] text-neutral-500 dark:text-neutral-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Content ────────────────────────────────────────────────────── */}
        {isLoading ? (
          /* Skeleton grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 rounded-card-lg border border-neutral-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.04]">
                <Skeleton shape="line" height={20} width="70%" />
                <Skeleton shape="line" height={12} width="50%" />
                <Skeleton shape="line" height={8} className="rounded-full" />
                <Skeleton shape="line" height={12} width="80%" />
              </div>
            ))}
          </div>
        ) : loadError === 'auth' ? (
          <div className="flex flex-col items-center justify-center py-20 text-center motion-safe:animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.06] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-5">
              {language === 'ko' ? '로그인이 필요합니다.' : 'Please sign in to view your vocab book.'}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="pressable px-6 py-2.5 rounded-2xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              {language === 'ko' ? '로그인' : 'Sign In'}
            </button>
          </div>
        ) : loadError === 'error' ? (
          <div className="flex flex-col items-center justify-center py-20 text-center motion-safe:animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              {language === 'ko' ? '단어장을 불러오지 못했어요.' : 'Failed to load vocab book.'}
            </p>
          </div>
        ) : items.length === 0 ? (
          /* Empty state — designed */
          <div className="flex flex-col items-center justify-center py-20 text-center motion-safe:animate-fade-up">
            {/* Illustrated icon container */}
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-100 to-violet-100 dark:from-primary-500/10 dark:to-violet-500/10 border border-primary-200 dark:border-primary-500/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-11 h-11 text-primary-400 dark:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              {/* Decorative dots */}
              <div aria-hidden="true" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary-400/30 dark:bg-primary-500/20" />
              <div aria-hidden="true" className="absolute -bottom-1 -left-1.5 w-3 h-3 rounded-full bg-violet-400/30 dark:bg-violet-500/20" />
            </div>

            <h2 className="text-display-2 text-neutral-900 dark:text-white mb-2">
              {activeTab === 'mastered'
                ? (language === 'ko' ? '아직 마스터한 단어가 없어요' : 'No mastered words yet')
                : activeTab === 'due'
                  ? (language === 'ko' ? '복습할 단어가 없어요' : 'Nothing due today')
                  : (language === 'ko' ? '아직 단어가 없어요' : 'No words yet')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs leading-relaxed">
              {activeTab === 'mastered'
                ? (language === 'ko' ? '대화를 계속하면 단어를 마스터하게 돼요.' : 'Keep practicing to master words.')
                : activeTab === 'due'
                  ? (language === 'ko' ? '모든 단어가 최신 상태예요!' : 'All caught up — great work!')
                  : (language === 'ko'
                      ? 'Talk 페이지에서 대화하면서 새 단어를 추가해보세요.'
                      : 'Start a conversation on the Talk page to add new words.')}
            </p>
            {(activeTab === 'all' || activeTab === 'today') && (
              <button
                onClick={() => router.push('/talk')}
                className="pressable px-6 py-2.5 rounded-2xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 shadow-md shadow-primary-500/20 transition-all"
              >
                {language === 'ko' ? 'Talk 시작하기' : 'Go to Talk'}
              </button>
            )}
          </div>
        ) : (
          /* ─── Word card grid ──────────────────────────────────────────── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 motion-safe:animate-fade-up">
            {items.map((item, idx) => (
              <Card
                key={item.id}
                variant="default"
                padding="none"
                className={`flex flex-col gap-0 overflow-hidden transition-all duration-300 hover:shadow-card-hover dark:hover:shadow-card-hover-dark hover:-translate-y-0.5 motion-safe:animate-fade-up`}
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              >
                {/* Mastered accent bar */}
                {item.status === 'mastered' && (
                  <div aria-hidden="true" className="h-1 w-full bg-emerald-400 dark:bg-emerald-500 rounded-t-none" />
                )}

                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Word (display-2) + status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-bold text-neutral-900 dark:text-white leading-tight break-words flex-1">
                      {item.term}
                    </p>
                    {item.status === 'mastered' && (
                      <Badge variant="success" size="sm" dot>
                        {language === 'ko' ? '마스터' : 'Mastered'}
                      </Badge>
                    )}
                    {item.status === 'archived' && (
                      <Badge variant="default" size="sm">
                        {language === 'ko' ? '보관' : 'Archived'}
                      </Badge>
                    )}
                    {item.status === 'active' && (
                      <Badge variant="info" size="sm">
                        {language === 'ko' ? '학습중' : 'Active'}
                      </Badge>
                    )}
                  </div>

                  {/* Difficulty tier label (secondary) */}
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {language === 'ko'
                      ? difficultyLabelKo[item.difficulty]
                      : difficultyLabel[item.difficulty]}
                  </p>

                  {/* Proficiency bar with label (tertiary) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs text-neutral-400 dark:text-neutral-500">
                        {language === 'ko' ? '숙련도' : 'Proficiency'}
                      </span>
                      <span className={`text-2xs font-semibold tabular-nums ${
                        item.proficiency >= 80
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.proficiency >= 40
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-primary-500 dark:text-primary-400'
                      }`}>
                        {item.proficiency}%
                      </span>
                    </div>
                    <ProgressBar
                      value={item.proficiency}
                      variant={proficiencyVariant(item.proficiency)}
                      size="sm"
                      label={`${item.term} 숙련도`}
                    />
                  </div>

                  {/* Source sentence (example — tertiary) */}
                  {item.sourceSentence && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 line-clamp-2 leading-relaxed italic">
                      &ldquo;{item.sourceSentence}&rdquo;
                    </p>
                  )}

                  {/* Date stamp */}
                  <p className="text-2xs text-neutral-300 dark:text-neutral-600 mt-auto">
                    {item.sourceDate}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      <BottomNav />
    </div>
  );
}
