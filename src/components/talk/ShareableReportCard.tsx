'use client';

import React from 'react';
import type { Language } from '@/lib/i18n';
import type { Persona } from '@/lib/personas';
import type { SpeechMetrics } from '@/lib/speechMetrics';

interface LevelDetails {
  grammar: number;
  vocabulary: number;
  fluency: number;
  comprehension: number;
  summary: string;
}

interface Analysis {
  corrections: { original: string; intended: string; corrected: string; explanation: string; category: string }[];
  patterns: { type: string; count: number; tip: string }[];
  strengths: string[];
  overallLevel: string;
  evaluatedGrade?: string;
  levelDetails?: LevelDetails;
  encouragement: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface ShareableReportCardProps {
  analysis: Analysis | null;
  tutorId: string;
  persona: Persona;
  speechMetrics: SpeechMetrics | null;
  conversationTime: number;
  language: Language;
  userName: string;
}

// Tutor-specific gradient configurations for the card background
const tutorGradients: Record<string, { from: string; via: string; to: string; accent: string; glow: string }> = {
  emma: {
    from: '#1a0a10',
    via: '#3b0a1f',
    to: '#0f0508',
    accent: '#f43f5e',
    glow: 'rgba(244,63,94,0.35)',
  },
  james: {
    from: '#08091a',
    via: '#0f1240',
    to: '#050610',
    accent: '#6366f1',
    glow: 'rgba(99,102,241,0.35)',
  },
  charlotte: {
    from: '#0f0820',
    via: '#2a0f4a',
    to: '#070310',
    accent: '#a855f7',
    glow: 'rgba(168,85,247,0.35)',
  },
  oliver: {
    from: '#041210',
    via: '#063028',
    to: '#020a08',
    accent: '#14b8a6',
    glow: 'rgba(20,184,166,0.35)',
  },
  alina: {
    from: '#1a0d04',
    via: '#3d1a08',
    to: '#0f0602',
    accent: '#f97316',
    glow: 'rgba(249,115,22,0.35)',
  },
  henry: {
    from: '#061408',
    via: '#103018',
    to: '#020804',
    accent: '#22c55e',
    glow: 'rgba(34,197,94,0.35)',
  },
};

const tutorImages: Record<string, string> = {
  emma: '/tutors/emma.png',
  james: '/tutors/james.png',
  charlotte: '/tutors/charlotte.png',
  oliver: '/tutors/oliver.png',
  alina: '/tutors/alina.png',
  henry: '/tutors/henry.png',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function WaveIconSVG({ size, accent }: { size: number; accent: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="10" height="24" rx="5" fill={accent} />
      <rect x="27" y="12" width="10" height="40" rx="5" fill={accent} />
      <rect x="44" y="20" width="10" height="24" rx="5" fill={accent} />
    </svg>
  );
}

// Top 3 stats to highlight on the card
function getHighlightStats(
  analysis: Analysis | null,
  speechMetrics: SpeechMetrics | null,
  language: Language,
): { label: string; value: string; icon: string }[] {
  const stats: { label: string; value: string; icon: string }[] = [];

  if (analysis?.evaluatedGrade) {
    stats.push({
      label: language === 'ko' ? 'CEFR 레벨' : 'CEFR Level',
      value: analysis.evaluatedGrade,
      icon: '📊',
    });
  }

  if (speechMetrics) {
    stats.push({
      label: language === 'ko' ? '말하기 속도' : 'Speaking Speed',
      value: `${speechMetrics.wordsPerMinute} WPM`,
      icon: '🎙️',
    });
    stats.push({
      label: language === 'ko' ? '어휘 다양성' : 'Vocab Diversity',
      value: `${Math.round(speechMetrics.vocabularyDiversity * 100)}%`,
      icon: '📚',
    });
  }

  if (analysis?.levelDetails && stats.length < 3) {
    const avg = Math.round(
      (analysis.levelDetails.grammar +
        analysis.levelDetails.vocabulary +
        analysis.levelDetails.fluency +
        analysis.levelDetails.comprehension) /
        4,
    );
    stats.push({
      label: language === 'ko' ? '종합 점수' : 'Overall Score',
      value: `${avg}/100`,
      icon: '⭐',
    });
  }

  return stats.slice(0, 3);
}

/**
 * ShareableReportCard — off-screen component captured by html2canvas for Instagram Story sharing.
 * Rendered at 540×960 CSS px (displayed at physical 1080×1920 via html2canvas scale=2).
 * Always uses dark gradient style regardless of user's theme.
 */
const ShareableReportCard = React.forwardRef<HTMLDivElement, ShareableReportCardProps>(
  function ShareableReportCard(
    { analysis, tutorId, persona, speechMetrics, conversationTime, language, userName },
    ref,
  ) {
    const gradient = tutorGradients[tutorId] || tutorGradients.emma;
    const tutorImageSrc = tutorImages[tutorId] || tutorImages.emma;
    const highlightStats = getHighlightStats(analysis, speechMetrics, language);

    const cta =
      language === 'ko'
        ? 'AI 튜터와 영어 회화 연습'
        : 'Practice English with AI Tutors';

    const sessionLabel = language === 'ko' ? '세션 시간' : 'Session Time';
    const encouragementText = analysis?.encouragement ?? '';

    return (
      <div
        ref={ref}
        style={{
          width: '540px',
          height: '960px',
          position: 'absolute',
          left: '-9999px',
          top: '0',
          overflow: 'hidden',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', 'Inter', sans-serif",
          background: `radial-gradient(ellipse at 30% 20%, ${gradient.glow} 0%, transparent 55%),
                       radial-gradient(ellipse at 70% 80%, ${gradient.glow} 0%, transparent 55%),
                       linear-gradient(160deg, ${gradient.from} 0%, ${gradient.via} 50%, ${gradient.to} 100%)`,
        }}
      >
        {/* Subtle noise texture overlay via repeating gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'200\' height=\'200\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />

        {/* Inner layout */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '48px 40px 40px',
            boxSizing: 'border-box',
          }}
        >
          {/* ── Header: Logo + Brand ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <WaveIconSVG size={36} accent={gradient.accent} />
            <span
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.5px',
              }}
            >
              TapTalk
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              {new Date().toLocaleDateString()}
            </span>
          </div>

          {/* ── Tutor Avatar + Name ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '36px' }}>
            {/* Avatar circle */}
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                padding: '3px',
                background: `linear-gradient(135deg, ${gradient.accent}, rgba(255,255,255,0.2))`,
                marginBottom: '16px',
                boxShadow: `0 0 40px ${gradient.glow}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tutorImageSrc}
                alt={persona.name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
                crossOrigin="anonymous"
              />
            </div>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>
              {language === 'ko' ? '오늘의 튜터' : "Today's Tutor"}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {persona.name}
              <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>
                {persona.nationality === 'american' ? '🇺🇸' : '🇬🇧'}
              </span>
            </p>
            {userName && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '6px 0 0' }}>
                {userName}
              </p>
            )}
          </div>

          {/* ── Session Time Banner ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '14px 24px',
              marginBottom: '28px',
            }}
          >
            <span style={{ fontSize: '20px' }}>⏱️</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>{sessionLabel}</span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-1px' }}>
              {formatTime(conversationTime)}
            </span>
          </div>

          {/* ── Key Stats ── */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '28px',
            }}
          >
            {highlightStats.map((stat, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: `1px solid rgba(255,255,255,0.12)`,
                  borderRadius: '16px',
                  padding: '16px 10px',
                  textAlign: 'center',
                  boxShadow:
                    i === 0
                      ? `0 0 24px ${gradient.glow}`
                      : 'none',
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{stat.icon}</div>
                <div
                  style={{
                    fontSize: i === 0 ? '24px' : '18px',
                    fontWeight: 800,
                    color: i === 0 ? gradient.accent : '#ffffff',
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                    marginBottom: '6px',
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.3 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Encouragement Quote ── */}
          {encouragementText && (
            <div
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: `1px solid ${gradient.accent}30`,
                borderLeft: `3px solid ${gradient.accent}`,
                borderRadius: '0 14px 14px 0',
                padding: '18px 20px',
                marginBottom: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '15px',
                  fontStyle: 'italic',
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.6,
                  margin: '0 0 8px',
                }}
              >
                &ldquo;{encouragementText}&rdquo;
              </p>
              <p style={{ fontSize: '12px', color: gradient.accent, margin: 0, fontWeight: 600 }}>
                — {persona.name}
              </p>
            </div>
          )}

          {/* ── CTA Footer ── */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.4)',
                  margin: '0 0 4px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 600,
                }}
              >
                taptalk.app
              </p>
              <p style={{ fontSize: '15px', color: '#ffffff', margin: 0, fontWeight: 600 }}>
                {cta}
              </p>
            </div>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${gradient.accent}, ${gradient.accent}99)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WaveIconSVG size={28} accent="#ffffff" />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default ShareableReportCard;
