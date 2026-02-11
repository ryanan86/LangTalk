'use client';

import type { Language } from '@/lib/i18n';
import PhoneMockup from './PhoneMockup';
import TrustBadges from './TrustBadges';

interface HeroSectionProps {
  typingText: string;
  language: Language;
  t: {
    heroTitle: string;
    heroSubtitle: string;
  };
  mounted: boolean;
  onCtaClick?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function HeroSection({ typingText, language, t, mounted, onCtaClick }: HeroSectionProps) {
  return (
    <section
      className={`pt-12 sm:pt-20 pb-8 sm:pb-12 transition-all duration-1000 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* 2-column layout */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Left: Text content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge with live indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 mb-6 sm:mb-8 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm text-neutral-600 dark:text-white/70">AI-Powered English Practice</span>
              <span className="text-xs text-neutral-400 dark:text-white/40 hidden sm:inline">|</span>
              <span className="text-xs text-purple-500 dark:text-purple-400 hidden sm:inline">Live</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-500 dark:from-white dark:via-white dark:to-white/50 bg-clip-text text-transparent">
                {t.heroTitle}
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                {t.heroSubtitle}
              </span>
            </h1>

            {/* Typewriter Effect */}
            <div className="h-8 sm:h-10 flex items-center justify-center lg:justify-start mb-6 sm:mb-8">
              <p className="text-lg sm:text-xl text-neutral-500 dark:text-white/70 font-medium">
                {typingText}
                <span className="animate-blink text-purple-400 ml-0.5">|</span>
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-8">
              {[
                { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', label: language === 'ko' ? '실시간 피드백' : 'Real-time Feedback' },
                { icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', label: language === 'ko' ? '음성 인식' : 'Voice Recognition' },
                { icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: language === 'ko' ? 'AI 튜터' : 'AI Tutors' },
                { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', label: language === 'ko' ? 'IB 커리큘럼' : 'IB Curriculum' },
                { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: language === 'ko' ? '진행 추적' : 'Progress Tracking' },
              ].map((pill) => (
                <div key={pill.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 shadow-sm dark:shadow-none text-sm text-neutral-600 dark:text-white/60 hover:bg-neutral-50 dark:hover:bg-white/10 hover:text-neutral-800 dark:hover:text-white/80 transition-all cursor-default">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={pill.icon} />
                  </svg>
                  <span>{pill.label}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="flex flex-col items-center lg:items-start gap-3">
              <a
                href="/login"
                className="group relative px-8 py-4 rounded-2xl text-white font-bold text-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-purple-500/20 hover:shadow-[0_8px_40px_rgba(124,58,237,0.4)] active:scale-[0.98] inline-block text-center"
              >
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-[length:200%_auto] animate-gradient" />
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <span className="relative">
                  {language === 'ko' ? '무료로 시작하기' : 'Start Free'}
                </span>
              </a>
              <span className="text-xs text-[var(--text-muted)]">
                {language === 'ko' ? '결제 정보 불필요 · 가입 후 바로 시작' : 'No credit card required · Start instantly'}
              </span>
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex-1 flex justify-center mt-4 lg:mt-0">
            <PhoneMockup />
          </div>
        </div>

        {/* Trust Badges + Review Carousel */}
        <TrustBadges language={language} />
      </div>
    </section>
  );
}
