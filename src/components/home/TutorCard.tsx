'use client';

import type { Language } from '@/lib/i18n';
import Image from 'next/image';
import { Flag } from '@/components/Icons';

interface Persona {
  id: string;
  name: string;
  nationality: 'american' | 'british';
  gender: 'female' | 'male';
  voice: string;
  gradient: string;
  flag: string;
  sampleText: string;
}

interface TutorCardProps {
  persona: Persona;
  isSelected: boolean;
  onSelect: () => void;
  onPreviewVoice: (persona: Persona, e: React.MouseEvent) => void;
  isPlaying: boolean;
  desc: string;
  style: string;
  language: Language;
}

export default function TutorCard({
  persona,
  isSelected,
  onSelect,
  onPreviewVoice,
  isPlaying,
  desc,
  style,
  language,
}: TutorCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`group relative text-center transition-all duration-300 ${
        isSelected ? 'scale-[1.02]' : 'hover:scale-[1.02]'
      }`}
    >
      {/* Card Container */}
      <div
        className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
          isSelected
            ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950 bg-white/[0.06]'
            : 'bg-white/[0.04] hover:bg-white/[0.08]'
        }`}
      >
        {/* Large Profile Image */}
        <div className="relative h-44 sm:h-56 lg:h-72 overflow-hidden">
          {/* Background Glow */}
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-2/3 bg-gradient-to-t ${persona.gradient} rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity`}
          />

          {/* Tutor Image */}
          <div className="absolute inset-0">
            <Image
              src={`/tutors/${persona.id}.png`}
              alt={persona.name}
              fill
              className={`object-cover transition-transform duration-500 contrast-[1.02] ${
                persona.id === 'emma'
                  ? 'scale-110 group-hover:scale-115 object-top'
                  : persona.id === 'james'
                    ? 'scale-105 group-hover:scale-110 object-top'
                    : persona.id === 'charlotte'
                      ? 'scale-110 group-hover:scale-115 object-top'
                      : persona.id === 'alina'
                        ? 'scale-110 group-hover:scale-115 object-top'
                        : persona.id === 'henry'
                          ? 'scale-110 group-hover:scale-115 object-top'
                          : 'scale-90 group-hover:scale-95 object-center'
              }`}
              style={{
                filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))',
                objectPosition: persona.id === 'oliver' ? 'center 20%' : undefined,
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `/tutors/${persona.id}.jpg`;
              }}
            />
          </div>

          {/* Dark gradient overlay on image bottom */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#020617] via-[#020617]/60 to-transparent" />

          {/* Selection Check */}
          {isSelected && (
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/50 z-10">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Flag Badge */}
          <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-sm rounded-md p-1 border border-white/10">
            <Flag country={persona.flag as 'US' | 'UK'} size={24} />
          </div>
        </div>

        {/* Info Section */}
        <div className="relative p-4 sm:p-5 bg-transparent -mt-8 pt-12 z-10">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
            {persona.name}
          </h3>
          <p className="text-white/60 text-sm mb-1">{desc}</p>
          <p className="text-white/40 text-xs mb-4">{style}</p>

          {/* Voice Preview Button */}
          <button
            onClick={(e) => onPreviewVoice(persona, e)}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              isPlaying
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/[0.06] text-white/60 border border-white/10 hover:bg-white/[0.12] hover:text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <div className="flex items-end gap-0.5 h-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-violet-400"
                      style={{
                        animation: 'voice-wave 0.4s ease-in-out infinite',
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
                {language === 'ko' ? '재생 중...' : 'Playing...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {language === 'ko' ? '목소리 미리듣기' : 'Preview Voice'}
              </>
            )}
          </button>
        </div>
      </div>
    </button>
  );
}
