'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { StudyPlan, StudyStats } from '@/lib/studyTypes';
import { fetchStudyState } from '@/lib/studyClient';
import StudySetupWizard from '@/components/study/StudySetupWizard';
import StudyDashboard from '@/components/study/StudyDashboard';
import StudySessionPlayer from '@/components/study/StudySessionPlayer';
import BottomNav from '@/components/BottomNav';

type View = 'loading' | 'wizard' | 'dashboard' | 'session' | 'error';

export default function StudyPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('loading');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setView('loading');
    try {
      // Load study state + user interests (for plan personalization) in parallel.
      const [state, profileRes] = await Promise.allSettled([
        fetchStudyState(signal),
        fetch('/api/user-profile', { signal }).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.profile?.interests) {
        setInterests(profileRes.value.profile.interests);
      }

      if (state.status === 'fulfilled') {
        setPlan(state.value.plan);
        setStats(state.value.stats);
        setView(state.value.plan ? 'dashboard' : 'wizard');
      } else {
        // No plan yet is expected to surface as plan:null; a hard failure -> error.
        setView('error');
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      console.error('Study load error:', e);
      setView('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handlePlanCreated = useCallback((newPlan: StudyPlan) => {
    setPlan(newPlan);
    setView('dashboard');
  }, []);

  const handleSessionCompleted = useCallback((updatedStats: StudyStats) => {
    setStats(updatedStats);
    setView('dashboard');
  }, []);

  // ---------- Full-screen session (no bottom nav) ----------
  if (view === 'session' && plan) {
    return (
      <StudySessionPlayer
        plan={plan}
        stats={stats}
        onExit={() => setView('dashboard')}
        onCompleted={handleSessionCompleted}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-dark-bg">
      {/* Header (hidden during wizard which has its own progress header) */}
      {view !== 'wizard' && (
        <header
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          className="px-4 sm:px-6 pb-3 sticky top-0 z-40 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800"
        >
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              aria-label="홈으로"
              className="p-2 -ml-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">스터디 프로그램</h1>
            <div className="w-9" />
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col w-full">
        {view === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex gap-2">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
          </div>
        )}

        {view === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-5">
              스터디 정보를 불러오지 못했어요.
            </p>
            <button onClick={() => load()} className="btn-primary px-6 py-3">다시 시도</button>
          </div>
        )}

        {view === 'wizard' && (
          <StudySetupWizard
            interests={interests}
            onComplete={handlePlanCreated}
            onCancel={() => router.push('/')}
          />
        )}

        {view === 'dashboard' && plan && (
          <StudyDashboard
            plan={plan}
            stats={stats}
            onStartSession={() => setView('session')}
          />
        )}
      </main>

      {view !== 'wizard' && (
        <>
          <div className="h-20" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }} />
          <BottomNav />
        </>
      )}
    </div>
  );
}
