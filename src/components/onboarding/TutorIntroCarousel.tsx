'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface TutorIntroCarouselProps {
  onComplete: (selectedTutorId?: string) => void;
  language: 'ko' | 'en';
}

interface TutorInfo {
  id: string;
  name: string;
  nationality: string;
  nationalityKo: string;
  flag: 'US' | 'UK';
  voice: string;
  gradient: string;
  bgGradient: string;
  descriptionEn: string;
  descriptionKo: string;
  personalityEn: string;
  personalityKo: string;
  imagePath: string;
  sampleTextEn: string;
  sampleTextKo: string;
}

const tutors: TutorInfo[] = [
  {
    id: 'emma',
    name: 'Emma',
    nationality: 'American',
    nationalityKo: '미국인',
    flag: 'US',
    voice: 'shimmer',
    gradient: 'from-rose-400 to-pink-500',
    bgGradient: 'from-rose-500/20 to-pink-500/20',
    descriptionEn: 'Your American bestie',
    descriptionKo: '미국인 베스트 프렌드',
    personalityEn: 'Fun, expressive, the friend who hypes you up. She makes every conversation feel exciting and natural.',
    personalityKo: '재미있고 표현력 풍부한 친구. 모든 대화를 신나고 자연스럽게 만들어주는 응원 전문가.',
    imagePath: '/tutors/emma.png',
    sampleTextEn: "Hey! I'm Emma, your American bestie. Let's chat and have fun!",
    sampleTextKo: "안녕! 나는 Emma야, 네 미국인 베프. 같이 수다 떨자!",
  },
  {
    id: 'james',
    name: 'James',
    nationality: 'American',
    nationalityKo: '미국인',
    flag: 'US',
    voice: 'echo',
    gradient: 'from-blue-400 to-indigo-500',
    bgGradient: 'from-blue-500/20 to-indigo-500/20',
    descriptionEn: 'Chill American bro',
    descriptionKo: '편안한 미국인 친구',
    personalityEn: 'Relaxed, funny, great storyteller. He keeps things light and makes you feel at ease.',
    personalityKo: '여유롭고 유머러스한 이야기꾼. 가볍고 편안한 분위기를 만들어주는 친구.',
    imagePath: '/tutors/james.png',
    sampleTextEn: "Hey dude, I'm James. Let's just chill and talk about whatever.",
    sampleTextKo: "안녕 친구, James야. 편하게 아무 얘기나 하자.",
  },
  {
    id: 'charlotte',
    name: 'Charlotte',
    nationality: 'British',
    nationalityKo: '영국인',
    flag: 'UK',
    voice: 'fable',
    gradient: 'from-violet-400 to-purple-500',
    bgGradient: 'from-violet-500/20 to-purple-500/20',
    descriptionEn: 'Witty British friend',
    descriptionKo: '위트있는 영국인 친구',
    personalityEn: 'Charming, clever, great banter. She brings warmth and wit to every conversation.',
    personalityKo: '매력적이고 똑똑한 대화 상대. 재치 넘치는 유머와 따뜻함을 가진 친구.',
    imagePath: '/tutors/charlotte.png',
    sampleTextEn: "Hello! I'm Charlotte. Fancy a chat? I promise it'll be brilliant.",
    sampleTextKo: "안녕! Charlotte이야. 같이 대화할래? 분명 즐거울 거야.",
  },
  {
    id: 'oliver',
    name: 'Oliver',
    nationality: 'British',
    nationalityKo: '영국인',
    flag: 'UK',
    voice: 'onyx',
    gradient: 'from-emerald-400 to-teal-500',
    bgGradient: 'from-emerald-500/20 to-teal-500/20',
    descriptionEn: 'Cool British guy',
    descriptionKo: '쿨한 영국인 친구',
    personalityEn: 'Dry wit, genuine, easy to talk to. He reads the room perfectly and keeps it real.',
    personalityKo: '드라이한 유머와 진솔함. 분위기를 잘 읽고 진짜 대화를 나누는 친구.',
    imagePath: '/tutors/oliver.png',
    sampleTextEn: "Right then, I'm Oliver. Let's have a proper chat, shall we?",
    sampleTextKo: "그럼, Oliver야. 제대로 대화해볼까?",
  },
  {
    id: 'alina',
    name: 'Alina',
    nationality: 'American',
    nationalityKo: '미국인',
    flag: 'US',
    voice: 'nova',
    gradient: 'from-amber-400 to-orange-500',
    bgGradient: 'from-amber-500/20 to-orange-500/20',
    descriptionEn: 'Bright & bubbly friend',
    descriptionKo: '밝고 활발한 친구',
    personalityEn: 'Cheerful, energetic, always excited. A bubbly young friend who makes everything fun.',
    personalityKo: '에너지 넘치고 늘 신나는 또래 친구. 모든 것을 재미있게 만드는 활발한 아이.',
    imagePath: '/tutors/alina.png',
    sampleTextEn: "Oh cool! I'm Alina! Let's talk about fun stuff!",
    sampleTextKo: "안녕! 나는 Alina야! 재미있는 얘기 하자!",
  },
  {
    id: 'henly',
    name: 'Henry',
    nationality: 'American',
    nationalityKo: '미국인',
    flag: 'US',
    voice: 'alloy',
    gradient: 'from-lime-400 to-green-500',
    bgGradient: 'from-lime-500/20 to-green-500/20',
    descriptionEn: 'Playful & curious buddy',
    descriptionKo: '장난꾸러기 호기심쟁이',
    personalityEn: 'Adventurous, funny, full of questions. A playful young buddy who loves discovering new things.',
    personalityKo: '모험심 가득하고 질문이 많은 또래 친구. 새로운 것을 발견하는 걸 좋아하는 장난꾸러기.',
    imagePath: '/tutors/henly.png',
    sampleTextEn: "Whoa, hey! I'm Henry! Wanna know something cool?",
    sampleTextKo: "안녕! 나는 Henry야! 뭔가 신기한 거 알려줄까?",
  },
];

export default function TutorIntroCarousel({ onComplete, language }: TutorIntroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTutor, setSelectedTutor] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const scrollToIndex = useCallback((index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToIndex(currentIndex);
  }, [currentIndex, scrollToIndex]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < tutors.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  const playVoicePreview = async (tutor: TutorInfo) => {
    if (playingVoice === tutor.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoice(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPlayingVoice(tutor.id);

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: tutor.sampleTextEn,
          voice: tutor.voice,
        }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch {
      setPlayingVoice(null);
    }
  };

  const handleImageError = (tutorId: string) => {
    setImageErrors(prev => ({ ...prev, [tutorId]: true }));
  };

  const currentTutor = tutors[currentIndex];

  return (
    <div className="flex flex-col items-center w-full px-2">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1 text-center">
        {language === 'ko' ? '튜터를 만나보세요' : 'Meet Your Tutors'}
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5 text-center">
        {language === 'ko'
          ? '6명의 AI 튜터가 기다리고 있어요'
          : 'Six AI tutors are waiting for you'}
      </p>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {tutors.map((tutor) => (
            <div
              key={tutor.id}
              className="w-full flex-shrink-0 px-4"
            >
              <div
                onClick={() => setSelectedTutor(tutor.id === selectedTutor ? null : tutor.id)}
                className={`
                  relative rounded-2xl overflow-hidden cursor-pointer
                  border-2 transition-all duration-300
                  ${selectedTutor === tutor.id
                    ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }
                  bg-white dark:bg-dark-surface
                `}
              >
                {/* Avatar Area with Gradient */}
                <div className={`relative h-48 sm:h-56 bg-gradient-to-br ${tutor.bgGradient}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${tutor.gradient} opacity-20`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-4 ring-white/30 shadow-xl">
                      {!imageErrors[tutor.id] ? (
                        <Image
                          src={tutor.imagePath}
                          alt={tutor.name}
                          fill
                          className="object-cover"
                          onError={() => handleImageError(tutor.id)}
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${tutor.gradient} flex items-center justify-center`}>
                          <span className="text-4xl font-bold text-white drop-shadow-lg">
                            {tutor.name[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Flag badge */}
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {tutor.flag === 'US' ? '🇺🇸' : '🇬🇧'} {language === 'ko' ? tutor.nationalityKo : tutor.nationality}
                  </div>

                  {/* Selected badge */}
                  {selectedTutor === tutor.id && (
                    <div className="absolute top-3 left-3 bg-primary-500 rounded-full p-1">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info Area */}
                <div className="p-4">
                  <h4 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                    {tutor.name}
                  </h4>
                  <p className="text-sm font-medium text-primary-500 mb-2">
                    {language === 'ko' ? tutor.descriptionKo : tutor.descriptionEn}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                    {language === 'ko' ? tutor.personalityKo : tutor.personalityEn}
                  </p>

                  {/* Voice Preview Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playVoicePreview(tutor);
                    }}
                    className={`
                      w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-200
                      ${playingVoice === tutor.id
                        ? `bg-gradient-to-r ${tutor.gradient} text-white`
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }
                    `}
                  >
                    {playingVoice === tutor.id ? (
                      <>
                        <div className="flex items-end gap-0.5 h-4">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-white rounded-full"
                              style={{
                                animation: 'voice-wave 0.4s ease-in-out infinite',
                                animationDelay: `${i * 0.1}s`,
                              }}
                            />
                          ))}
                        </div>
                        <span>{language === 'ko' ? '재생 중...' : 'Playing...'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>{language === 'ko' ? '목소리 미리듣기' : 'Preview Voice'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="flex gap-2 mt-5 mb-5">
        {tutors.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`
              transition-all duration-300 rounded-full
              ${index === currentIndex
                ? `w-6 h-2.5 bg-gradient-to-r ${currentTutor.gradient}`
                : 'w-2.5 h-2.5 bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500'
              }
            `}
            aria-label={`Go to tutor ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation Arrows (desktop) */}
      <div className="hidden sm:flex gap-3 mb-5">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentIndex(prev => Math.min(tutors.length - 1, prev + 1))}
          disabled={currentIndex === tutors.length - 1}
          className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Continue Button */}
      <button
        onClick={() => onComplete(selectedTutor || undefined)}
        className="btn-primary py-3 text-base w-full max-w-xs"
      >
        {selectedTutor
          ? (language === 'ko' ? '이 튜터로 시작하기' : 'Choose Your First Tutor')
          : (language === 'ko' ? '계속하기' : 'Continue')
        }
      </button>
    </div>
  );
}
