'use client';

import type { Language } from '@/lib/i18n';
import { SpeechMetrics, calculateOverallScore, formatMetricsForDisplay, getImprovementTip } from '@/lib/speechMetrics';
import { useState, useEffect } from 'react';

interface AnalysisReviewProps {
  speechMetrics: SpeechMetrics;
  language: Language;
}

export default function AnalysisReview({ speechMetrics, language }: AnalysisReviewProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [animProgress, setAnimProgress] = useState(0);
  const overallScore = calculateOverallScore(speechMetrics);
  const metrics = formatMetricsForDisplay(speechMetrics, language);

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.floor(overallScore * eased));
      setAnimProgress(eased);
      if (t >= 1) {
        setDisplayScore(overallScore);
        setAnimProgress(1);
        clearInterval(timer);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [overallScore]);

  const getEncouragement = (score: number) => {
    if (language === 'ko') {
      if (score >= 85) return { title: '정말 멋져요!', message: '원어민 수준의 유창함을 보여주셨어요. 이 실력을 계속 유지하세요!', gradient: 'from-emerald-400 to-teal-500' };
      if (score >= 70) return { title: '훌륭한 실력이에요!', message: '자신감 있게 대화하는 모습이 인상적이에요. 조금만 더 연습하면 완벽해요!', gradient: 'from-cyan-400 to-blue-500' };
      if (score >= 55) return { title: '좋은 출발이에요!', message: '기초가 탄탄해요. 꾸준히 연습하면 더 유창해질 거예요!', gradient: 'from-violet-400 to-purple-500' };
      return { title: '잘 하고 있어요!', message: '대화를 시작한 것만으로도 큰 발걸음이에요. 계속 도전하세요!', gradient: 'from-pink-400 to-rose-500' };
    } else {
      if (score >= 85) return { title: 'Outstanding!', message: "You're speaking with near-native fluency. Keep up this excellent work!", gradient: 'from-emerald-400 to-teal-500' };
      if (score >= 70) return { title: 'Great Job!', message: "You're conversing with confidence. A bit more practice and you'll be perfect!", gradient: 'from-cyan-400 to-blue-500' };
      if (score >= 55) return { title: 'Good Start!', message: "Your foundation is solid. Keep practicing and you'll see rapid improvement!", gradient: 'from-violet-400 to-purple-500' };
      return { title: "You're Doing Great!", message: 'Starting the conversation is a huge step. Keep challenging yourself!', gradient: 'from-pink-400 to-rose-500' };
    }
  };

  const encouragement = getEncouragement(overallScore);

  // Arc gauge
  const arcRadius = 100;
  const circumference = 2 * Math.PI * arcRadius;
  const arcLen = (270 / 360) * circumference;
  const arcProgress = (displayScore / 100) * arcLen;

  // Radar chart
  const radarSize = 290;
  const radarCx = radarSize / 2;
  const radarCy = radarSize / 2;
  const radarR = 90;
  const axisCount = 6;

  const radarPoint = (idx: number, pct: number) => {
    const angle = (Math.PI * 2 * idx) / axisCount - Math.PI / 2;
    const r = (pct / 100) * radarR;
    return { x: radarCx + r * Math.cos(angle), y: radarCy + r * Math.sin(angle) };
  };

  const gridLevels = [25, 50, 75, 100];
  const gridPolys = gridLevels.map(lv =>
    Array.from({ length: axisCount }, (_, i) => radarPoint(i, lv))
      .map(p => `${p.x},${p.y}`).join(' ')
  );

  const dataPoints = metrics.map((_, i) => radarPoint(i, metrics[i].percent * animProgress));
  const dataPoly = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const sorted = [...metrics].sort((a, b) => b.percent - a.percent);
  const strengths = sorted.slice(0, 2);
  const growthAreas = sorted.slice(-2).reverse();

  const sectionBg = 'bg-neutral-50 dark:bg-[#1a1a1a]';

  return (
    <>
      {/* ====== SECTION: Arc Gauge Hero ====== */}
      <div data-report-section className={`${sectionBg} p-4`}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 p-6 sm:p-8">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-500/[0.06] rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10">
            <div className="text-center mb-6">
              <p className="text-cyan-300/70 text-[10px] sm:text-xs tracking-[0.2em] uppercase font-medium mb-2">
                {language === 'ko' ? '세션 완료' : 'Session Complete'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                {language === 'ko' ? '학습 분석' : 'Learning Analysis'}
              </h3>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                <svg className="w-full h-full transform -rotate-[135deg]" viewBox="0 0 240 240">
                  <circle cx="120" cy="120" r={arcRadius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
                  <defs>
                    <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>
                  <circle cx="120" cy="120" r={arcRadius} fill="none" stroke="url(#arcGrad)" strokeWidth="16" strokeDasharray={`${arcProgress} ${circumference}`} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.5))' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl sm:text-6xl font-bold bg-gradient-to-br from-cyan-200 via-purple-200 to-pink-200 bg-clip-text text-transparent leading-none">
                    {displayScore}
                  </span>
                  <span className="text-white/30 text-sm font-medium mt-1">/ 100</span>
                </div>
              </div>

              <div className="text-center mt-4 max-w-sm">
                <h4 className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${encouragement.gradient} bg-clip-text text-transparent mb-2`}>
                  {encouragement.title}
                </h4>
                <p className="text-slate-300/70 text-sm leading-relaxed">
                  {encouragement.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== SECTION: Radar + Strengths/Growth ====== */}
      <div data-report-section className={`${sectionBg} p-4 space-y-4`}>
        {/* Radar Chart */}
        <div className="rounded-2xl bg-slate-900/80 border border-white/[0.06] p-4 sm:p-5">
          <h4 className="text-sm sm:text-base font-semibold text-white mb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            {language === 'ko' ? '말하기 능력 균형' : 'Speaking Balance'}
          </h4>

          <div className="flex justify-center py-2">
            <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
              {gridPolys.map((poly, i) => (
                <polygon key={`grid-${i}`} points={poly} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              ))}
              {Array.from({ length: axisCount }, (_, i) => {
                const pt = radarPoint(i, 100);
                return <line key={`axis-${i}`} x1={radarCx} y1={radarCy} x2={pt.x} y2={pt.y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
              })}
              <polygon points={dataPoly} fill="rgba(139,92,246,0.12)" stroke="rgba(6,182,212,0.7)" strokeWidth="2" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.25))' }} />
              {dataPoints.map((pt, i) => (
                <circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill={metrics[i].level === 'high' ? '#10b981' : metrics[i].level === 'medium' ? '#06b6d4' : '#f59e0b'} stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
              ))}
              {metrics.map((m, i) => {
                const lp = radarPoint(i, 128);
                return (
                  <text key={`label-${i}`} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontWeight="500">
                    {m.label}
                  </text>
                );
              })}
            </svg>
          </div>

          <p className="text-center text-slate-500 text-[10px] sm:text-xs">
            {language === 'ko' ? '모든 영역에서 고르게 성장하는 것이 중요해요' : 'Balanced growth across all areas is the key'}
          </p>
        </div>

        {/* Strengths & Growth */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/[0.12] p-4">
            <h5 className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {language === 'ko' ? '나의 강점' : 'Strengths'}
            </h5>
            <div className="space-y-3">
              {strengths.map((m) => (
                <div key={m.label} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-400">{m.percent}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white leading-tight">{m.label}</p>
                    <p className="text-[10px] text-slate-400">{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-amber-500/[0.06] border border-amber-500/[0.12] p-4">
            <h5 className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {language === 'ko' ? '발전 포인트' : 'Growth Areas'}
            </h5>
            <div className="space-y-3">
              {growthAreas.map((m) => (
                <div key={m.label} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-amber-400">{m.percent}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white leading-tight">{m.label}</p>
                    <p className="text-[10px] text-slate-400">{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ====== SECTION: Detailed Metrics + Stats + Insights ====== */}
      <div data-report-section className={`${sectionBg} p-4 space-y-4`}>
        {/* Detailed Metrics */}
        <div className="rounded-2xl bg-slate-900/80 border border-white/[0.06] p-4 sm:p-5">
          <h4 className="text-sm sm:text-base font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            {language === 'ko' ? '세부 지표' : 'Detailed Metrics'}
          </h4>

          <div className="space-y-3.5">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm text-slate-300">{metric.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-white">{metric.value}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                      metric.level === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
                      metric.level === 'medium' ? 'bg-cyan-500/15 text-cyan-400' :
                      'bg-amber-500/15 text-amber-400'
                    }`}>
                      {metric.percent}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      metric.level === 'high' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                      metric.level === 'medium' ? 'bg-gradient-to-r from-cyan-500 to-blue-400' :
                      'bg-gradient-to-r from-amber-500 to-orange-400'
                    }`}
                    style={{
                      width: `${metric.percent * animProgress}%`,
                      boxShadow: metric.level === 'high' ? '0 0 8px rgba(16,185,129,0.35)' :
                        metric.level === 'medium' ? '0 0 8px rgba(6,182,212,0.35)' :
                        '0 0 8px rgba(245,158,11,0.35)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { value: speechMetrics.totalWords, label: language === 'ko' ? '총 단어' : 'Words', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
            { value: speechMetrics.totalSentences, label: language === 'ko' ? '문장 수' : 'Sentences', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { value: speechMetrics.uniqueWords, label: language === 'ko' ? '고유 단어' : 'Unique', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-slate-900/80 border border-white/[0.06] p-3.5 text-center">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                </svg>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white mb-0.5">{stat.value}</p>
              <p className="text-[10px] text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Learning Insights with Improvement Tips */}
        <div className="rounded-2xl bg-purple-500/[0.05] border border-purple-500/[0.08] p-4 sm:p-5">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            {language === 'ko' ? '학습 인사이트' : 'Learning Insights'}
          </h4>
          <div className="space-y-2.5">
            {strengths.map((s) => (
              <p key={`s-${s.label}`} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  {language === 'ko'
                    ? <><strong className="text-white">{s.label}</strong>{'이(가) 인상적이에요! '}{s.value}{' - 훌륭한 실력을 보여주셨어요.'}</>
                    : <><strong className="text-white">{s.label}</strong>{' is impressive! '}{s.value}{' shows excellent skill.'}</>
                  }
                </span>
              </p>
            ))}
            {growthAreas.map((g) => {
              const tip = getImprovementTip(g.key, language);
              return (
                <div key={`g-${g.label}`} className="space-y-1">
                  <p className="text-xs sm:text-sm text-slate-300 flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span>
                      {language === 'ko'
                        ? <><strong className="text-white">{g.label}</strong>{'을(를) 조금 더 연습하면 더 성장할 수 있어요!'}</>
                        : <>{'Practice '}<strong className="text-white">{g.label}</strong>{' a bit more to grow even further!'}</>
                      }
                    </span>
                  </p>
                  {tip && (
                    <p className="text-[11px] sm:text-xs text-cyan-300/60 ml-5 pl-0.5 border-l border-cyan-500/20">
                      {tip}
                    </p>
                  )}
                </div>
              );
            })}
            <p className="text-xs sm:text-sm text-slate-400 pt-1">
              {language === 'ko'
                ? `이번 세션에서 ${speechMetrics.totalWords}개 단어, ${speechMetrics.totalSentences}개 문장을 구성했어요. ${speechMetrics.uniqueWords}개의 다양한 단어를 활용한 점이 돋보여요!`
                : `You used ${speechMetrics.totalWords} words in ${speechMetrics.totalSentences} sentences this session. Using ${speechMetrics.uniqueWords} unique words shows great range!`
              }
            </p>
          </div>
        </div>

        <div className="text-center py-2">
          <p className="text-xs text-slate-500">
            {language === 'ko'
              ? '꾸준한 대화가 실력 향상의 비결이에요. 다음 대화도 기대돼요!'
              : 'Consistent practice is the key. Looking forward to your next conversation!'}
          </p>
        </div>
      </div>
    </>
  );
}
