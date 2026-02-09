'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Flag } from './Icons';

interface TutorAvatarProps {
  tutorId: 'emma' | 'james' | 'charlotte' | 'oliver' | 'alina' | 'henly';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  speaking?: boolean;
  className?: string;
  showName?: boolean;
}

export const tutorData = {
  emma: {
    name: 'Emma',
    nationality: 'American',
    flag: 'US',
    gradient: 'from-rose-400 to-pink-500',
    bgGradient: 'from-rose-500/20 to-pink-500/20',
    ringColor: 'ring-rose-400',
    glowColor: 'shadow-rose-500/50',
    imagePath: '/tutors/emma.png',
    fallbackColor: 'bg-gradient-to-br from-rose-400 to-pink-500',
  },
  james: {
    name: 'James',
    nationality: 'American',
    flag: 'US',
    gradient: 'from-blue-400 to-indigo-500',
    bgGradient: 'from-blue-500/20 to-indigo-500/20',
    ringColor: 'ring-blue-400',
    glowColor: 'shadow-blue-500/50',
    imagePath: '/tutors/james.png',
    fallbackColor: 'bg-gradient-to-br from-blue-400 to-indigo-500',
  },
  charlotte: {
    name: 'Charlotte',
    nationality: 'British',
    flag: 'UK',
    gradient: 'from-violet-400 to-purple-500',
    bgGradient: 'from-violet-500/20 to-purple-500/20',
    ringColor: 'ring-violet-400',
    glowColor: 'shadow-violet-500/50',
    imagePath: '/tutors/charlotte.png',
    fallbackColor: 'bg-gradient-to-br from-violet-400 to-purple-500',
  },
  oliver: {
    name: 'Oliver',
    nationality: 'British',
    flag: 'UK',
    gradient: 'from-emerald-400 to-teal-500',
    bgGradient: 'from-emerald-500/20 to-teal-500/20',
    ringColor: 'ring-emerald-400',
    glowColor: 'shadow-emerald-500/50',
    imagePath: '/tutors/oliver.png',
    fallbackColor: 'bg-gradient-to-br from-emerald-400 to-teal-500',
  },
  alina: {
    name: 'Alina',
    nationality: 'American',
    flag: 'US',
    gradient: 'from-amber-400 to-orange-500',
    bgGradient: 'from-amber-500/20 to-orange-500/20',
    ringColor: 'ring-amber-400',
    glowColor: 'shadow-amber-500/50',
    imagePath: '/tutors/alina.png',
    fallbackColor: 'bg-gradient-to-br from-amber-400 to-orange-500',
  },
  henly: {
    name: 'Henry',
    nationality: 'American',
    flag: 'US',
    gradient: 'from-lime-400 to-green-500',
    bgGradient: 'from-lime-500/20 to-green-500/20',
    ringColor: 'ring-lime-400',
    glowColor: 'shadow-lime-500/50',
    imagePath: '/tutors/henly.png',
    fallbackColor: 'bg-gradient-to-br from-lime-400 to-green-500',
  },
};

const sizeMap = {
  sm: { width: 48, height: 48, text: 'text-lg', ring: 'ring-2', glow: 'shadow-md' },
  md: { width: 80, height: 80, text: 'text-2xl', ring: 'ring-2', glow: 'shadow-lg' },
  lg: { width: 120, height: 120, text: 'text-4xl', ring: 'ring-3', glow: 'shadow-xl' },
  xl: { width: 200, height: 200, text: 'text-6xl', ring: 'ring-4', glow: 'shadow-2xl' },
};

export default function TutorAvatar({
  tutorId,
  size = 'md',
  speaking = false,
  className = '',
  showName = false,
}: TutorAvatarProps) {
  const tutor = tutorData[tutorId];
  const dimensions = sizeMap[size];
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        className="relative group"
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated glow effect when speaking */}
        {speaking && (
          <>
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${tutor.gradient} blur-xl opacity-60 animate-pulse`}
              style={{ transform: 'scale(1.2)' }}
            />
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${tutor.gradient} blur-md opacity-40`}
              style={{ transform: 'scale(1.1)', animation: 'pulse 1.5s ease-in-out infinite alternate' }}
            />
          </>
        )}

        {/* Hover glow effect */}
        {isHovered && !speaking && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${tutor.gradient} blur-lg opacity-30 transition-opacity duration-300`}
            style={{ transform: 'scale(1.1)' }}
          />
        )}

        {/* Main Avatar Container */}
        <div
          className={`
            relative w-full h-full rounded-full overflow-hidden
            ${dimensions.ring} ${tutor.ringColor}
            ${speaking ? `${dimensions.glow} ${tutor.glowColor}` : ''}
            transition-all duration-300
            ${isHovered ? 'scale-105' : 'scale-100'}
          `}
        >
          {/* Image or Fallback */}
          {!imageError ? (
            <Image
              src={tutor.imagePath}
              alt={tutor.name}
              fill
              className="object-cover contrast-[1.02]"
              style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))' }}
              onError={() => setImageError(true)}
              priority={size === 'xl' || size === 'lg'}
            />
          ) : (
            // Stylized fallback when image is not available
            <div className={`w-full h-full ${tutor.fallbackColor} flex items-center justify-center`}>
              <span className={`${dimensions.text} font-bold text-white drop-shadow-lg`}>
                {tutor.name[0]}
              </span>
            </div>
          )}

          {/* Speaking mouth animation overlay */}
          {speaking && !imageError && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Flag indicator */}
        <div
          className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-800 backdrop-blur-sm rounded-md p-0.5 shadow-lg"
        >
          <Flag country={tutor.flag as 'US' | 'UK'} size={size === 'sm' ? 14 : size === 'md' ? 18 : 24} />
        </div>

        {/* Speaking indicator waves */}
        {speaking && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`rounded-full bg-gradient-to-t ${tutor.gradient}`}
                style={{
                  width: size === 'sm' ? '2px' : '3px',
                  animation: 'voice-wave 0.4s ease-in-out infinite',
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name label - theme aware */}
      {showName && (
        <div className="text-center">
          <p className={`font-semibold text-neutral-900 dark:text-white ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
            {tutor.name}
          </p>
          {size !== 'sm' && (
            <p className="text-xs text-neutral-500 dark:text-white/50">{tutor.nationality}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Large display version for talk page
export function TutorAvatarLarge({
  tutorId,
  speaking = false,
  status = 'idle',
}: {
  tutorId: 'emma' | 'james' | 'charlotte' | 'oliver' | 'alina' | 'henly';
  speaking?: boolean;
  status?: 'idle' | 'listening' | 'thinking' | 'speaking';
}) {
  const tutor = tutorData[tutorId];
  const [imageError, setImageError] = useState(false);

  const statusColors = {
    idle: 'ring-neutral-300 dark:ring-white/20',
    listening: 'ring-green-400 shadow-green-500/30',
    thinking: 'ring-amber-400 shadow-amber-500/30',
    speaking: `${tutor.ringColor} ${tutor.glowColor}`,
  };

  const statusText = {
    idle: '',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Speaking...',
  };

  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div className="relative">
        {/* Animated rings for active states */}
        {status !== 'idle' && (
          <>
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${tutor.gradient} opacity-20 animate-ping`}
              style={{ transform: 'scale(1.3)' }}
            />
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${tutor.gradient} opacity-30 blur-xl`}
              style={{ transform: 'scale(1.2)' }}
            />
          </>
        )}

        <div
          className={`
            relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full overflow-hidden
            ring-4 ${statusColors[status]}
            shadow-2xl
            transition-all duration-500
          `}
        >
          {!imageError ? (
            <Image
              src={tutor.imagePath}
              alt={tutor.name}
              fill
              className="object-cover contrast-[1.02]"
              style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))' }}
              onError={() => setImageError(true)}
              priority
            />
          ) : (
            <div className={`w-full h-full ${tutor.fallbackColor} flex items-center justify-center`}>
              <span className="text-6xl font-bold text-white drop-shadow-lg">
                {tutor.name[0]}
              </span>
            </div>
          )}
        </div>

        {/* Flag */}
        <div className="absolute -bottom-2 -right-2 bg-white dark:bg-neutral-800 backdrop-blur-sm rounded-md p-1 shadow-lg">
          <Flag country={tutor.flag as 'US' | 'UK'} size={32} />
        </div>
      </div>

      {/* Name and Status */}
      <div className="mt-4 text-center">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{tutor.name}</h2>
        <p className="text-sm text-neutral-500 dark:text-white/50">{tutor.nationality} Tutor</p>
        {status !== 'idle' && (
          <p className={`
            mt-2 text-sm font-medium
            ${status === 'listening' ? 'text-green-400' : ''}
            ${status === 'thinking' ? 'text-amber-400' : ''}
            ${status === 'speaking' ? 'text-purple-400' : ''}
          `}>
            {statusText[status]}
          </p>
        )}
      </div>

      {/* Voice visualization when speaking */}
      {speaking && (
        <div className="mt-4 flex items-end justify-center gap-1 h-8">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full bg-gradient-to-t ${tutor.gradient}`}
              style={{
                animation: 'voice-wave 0.3s ease-in-out infinite',
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
