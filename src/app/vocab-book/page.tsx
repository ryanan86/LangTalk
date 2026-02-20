'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

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

export default function VocabBookPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [items, setItems] = useState<VocabBookItem[]>([]);
  const [stats, setStats] = useState({ total: 0, todayCount: 0, dueToday: 0, masteredCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const tabs: { key: TabType; labelKo: string; labelEn: string }[] = [
    { key: 'all', labelKo: '전체', labelEn: 'All' },
    { key: 'today', labelKo: '오늘', labelEn: 'Today' },
    { key: 'due', labelKo: '복습', labelEn: 'Due' },
    { key: 'mastered', labelKo: '마스터', labelEn: 'Mastered' },
  ];

  useEffect(() => {
    const loadVocab = async () => {
      setIsLoading(true);
      try {
        const scope = activeTab === 'mastered' ? 'all' : activeTab;
        const limit = activeTab === 'today' ? 20 : 100;
        const response = await fetch(`/api/vocab-book?scope=${scope}&limit=${limit}`);
        const data: VocabBookResponse = await response.json();

        const filtered =
          activeTab === 'mastered'
            ? (data.items || []).filter((item) => item.status === 'mastered')
            : data.items || [];

        setItems(filtered);
        setStats({
          total: data.total ?? 0,
          todayCount: data.todayCount ?? 0,
          dueToday: data.dueToday ?? 0,
          masteredCount: data.masteredCount ?? 0,
        });
      } catch (error) {
        console.error('Failed to load vocab book:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadVocab();
  }, [activeTab]);

  const statusBadge = (status: VocabBookItem['status']) => {
    if (status === 'mastered') {
      return {
        label: language === 'ko' ? '마스터' : 'Mastered',
        className: 'bg-green-500/20 text-green-400',
      };
    }
    if (status === 'archived') {
      return {
        label: language === 'ko' ? '보관' : 'Archived',
        className: 'bg-slate-500/20 text-slate-400',
      };
    }
    return {
      label: language === 'ko' ? '학습중' : 'Active',
      className: 'bg-teal-500/20 text-teal-400',
    };
  };

  const difficultyDots = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          i < difficulty ? 'bg-teal-400' : 'bg-white/10'
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      {/* Header */}
      <header className="bg-white/[0.04] backdrop-blur-md border-b border-white/[0.06] px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.10] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white">
            {language === 'ko' ? '단어장' : 'Vocab Book'}
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
            <p className="text-slate-500 text-xs mb-1">{language === 'ko' ? '전체 단어' : 'Total'}</p>
            <p className="text-white text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
            <p className="text-slate-500 text-xs mb-1">{language === 'ko' ? '오늘 추가' : 'Today'}</p>
            <p className="text-teal-400 text-2xl font-bold">{stats.todayCount}</p>
          </div>
          <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
            <p className="text-slate-500 text-xs mb-1">{language === 'ko' ? '복습 필요' : 'Due'}</p>
            <p className="text-amber-400 text-2xl font-bold">{stats.dueToday}</p>
          </div>
          <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
            <p className="text-slate-500 text-xs mb-1">{language === 'ko' ? '마스터' : 'Mastered'}</p>
            <p className="text-green-400 text-2xl font-bold">{stats.masteredCount}</p>
          </div>
        </div>

        {/* Tab Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {language === 'ko' ? tab.labelKo : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/[0.04] rounded-2xl flex items-center justify-center mb-4 border border-white/[0.06]">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-semibold mb-2">
              {language === 'ko' ? '아직 단어가 없어요' : 'No words yet'}
            </h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              {language === 'ko'
                ? 'Talk 페이지에서 대화하면서 새 단어를 추가해보세요.'
                : 'Start a conversation on the Talk page to add new words.'}
            </p>
            <button
              onClick={() => router.push('/talk')}
              className="px-6 py-3 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-xl text-sm font-medium hover:bg-teal-500/30 transition-colors"
            >
              {language === 'ko' ? 'Talk 시작하기' : 'Go to Talk'}
            </button>
          </div>
        ) : (
          /* Word Card Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((item) => {
              const badge = statusBadge(item.status);
              return (
                <div
                  key={item.id}
                  className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06] flex flex-col gap-3"
                >
                  {/* Term & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white font-semibold text-base leading-tight break-all">
                      {item.term}
                    </p>
                    <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Difficulty Dots */}
                  <div className="flex items-center gap-1">
                    {difficultyDots(item.difficulty)}
                    <span className="text-slate-500 text-xs ml-1">
                      {language === 'ko' ? '난이도' : 'Difficulty'}
                    </span>
                  </div>

                  {/* Proficiency Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-xs">
                        {language === 'ko' ? '숙련도' : 'Proficiency'}
                      </span>
                      <span className="text-teal-400 text-xs font-medium">{item.proficiency}%</span>
                    </div>
                    <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-400 rounded-full transition-all duration-300"
                        style={{ width: `${item.proficiency}%` }}
                      />
                    </div>
                  </div>

                  {/* Source Sentence */}
                  {item.sourceSentence && (
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                      {item.sourceSentence}
                    </p>
                  )}

                  {/* Source Date */}
                  <p className="text-slate-600 text-[10px] mt-auto">{item.sourceDate}</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
