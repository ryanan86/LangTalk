'use client';

import { useState, useRef } from 'react';

interface UseTTSPlaybackOptions {
  voice: string;
  onQueueEnd?: () => void;
}

interface UseTTSPlaybackReturn {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  ttsLoading: boolean;
  streamingText: string;
  setStreamingText: (v: string) => void;
  playTTS: (text: string, speed?: number) => Promise<void>;
  extractCompleteSentences: (text: string) => { sentences: string[]; remaining: string };
  queueTTS: (sentence: string) => void;
  stopFiller: () => void;
  prefetchAudio: (sentence: string, signal?: AbortSignal) => Promise<Blob>;
  clearQueue: () => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  fillerAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  ttsAbortRef: React.MutableRefObject<AbortController | null>;
  queueAbortRef: React.MutableRefObject<AbortController | null>;
  audioQueueRef: React.MutableRefObject<string[]>;
  isPlayingQueueRef: React.MutableRefObject<boolean>;
  processedSentencesRef: React.MutableRefObject<Set<string>>;
  audioCacheRef: React.MutableRefObject<Map<string, Promise<Blob>>>;
}

export function useTTSPlayback({ voice, onQueueEnd }: UseTTSPlaybackOptions): UseTTSPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsLoading, setTTSLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const isPlayingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const processedSentencesRef = useRef<Set<string>>(new Set());
  const audioCacheRef = useRef<Map<string, Promise<Blob>>>(new Map());
  const fillerAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const queueAbortRef = useRef<AbortController | null>(null);

  const stopFiller = () => {
    if (fillerAudioRef.current) {
      fillerAudioRef.current.onended = null;
      fillerAudioRef.current.pause();
      fillerAudioRef.current.currentTime = 0;
    }
  };

  const prefetchAudio = (sentence: string, signal?: AbortSignal): Promise<Blob> => {
    if (audioCacheRef.current.has(sentence)) {
      return audioCacheRef.current.get(sentence)!;
    }

    const promise = fetch('/api/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sentence, voice }),
      signal,
    }).then(res => {
      if (!res.ok) throw new Error(`TTS API error: ${res.status}`);
      return res.blob();
    });

    audioCacheRef.current.set(sentence, promise);
    return promise;
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setIsPlaying(false);
      audioCacheRef.current.clear();
      onQueueEnd?.();
      return;
    }

    isPlayingQueueRef.current = true;
    setIsPlaying(true);
    stopFiller();

    const sentence = audioQueueRef.current.shift()!;

    if (audioQueueRef.current.length > 0) {
      prefetchAudio(audioQueueRef.current[0], queueAbortRef.current?.signal);
    }

    try {
      const audioBlob = await prefetchAudio(sentence, queueAbortRef.current?.signal);
      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        if (audioRef.current) {
          const audio = audioRef.current;

          await new Promise<void>((resolve, reject) => {
            const loadTimeout = setTimeout(() => {
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('error', onError);
              console.warn('Audio load timeout - skipping sentence');
              reject(new Error('Audio load timeout'));
            }, 8000);

            const onCanPlay = () => {
              clearTimeout(loadTimeout);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              clearTimeout(loadTimeout);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load failed'));
            };

            audio.addEventListener('canplaythrough', onCanPlay, { once: true });
            audio.addEventListener('error', onError, { once: true });
            audio.preload = 'auto';
            audio.src = audioUrl;
            audio.load();
          });

          await new Promise<void>((resolve) => {
            const playTimeout = setTimeout(() => {
              console.warn('Audio play timeout - skipping sentence');
              audio.pause();
              resolve();
            }, 15000);

            audio.onended = () => { clearTimeout(playTimeout); resolve(); };
            audio.onerror = () => { clearTimeout(playTimeout); console.warn('Audio play error - skipping'); resolve(); };
            audio.play().catch((err) => { clearTimeout(playTimeout); console.warn('Audio play() rejected:', err); resolve(); });
          });
        }
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('TTS queue error:', error);
    }

    playNextInQueue();
  };

  const playTTS = async (text: string, speed?: number) => {
    // Synchronous ref guard — prevents double-invocation on rapid taps
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    ttsAbortRef.current?.abort();
    const controller = new AbortController();
    ttsAbortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), 10000);

    setTTSLoading(true);
    setIsPlaying(true);
    stopFiller();
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, ...(speed && { speed }) }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('TTS API error:', response.status);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        if (audioRef.current) {
          const audio = audioRef.current;

          await new Promise<void>((resolve, reject) => {
            const loadTimeout = setTimeout(() => {
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load timeout'));
            }, 10000);

            const onCanPlay = () => {
              clearTimeout(loadTimeout);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              clearTimeout(loadTimeout);
              audio.removeEventListener('canplaythrough', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load failed'));
            };

            audio.addEventListener('canplaythrough', onCanPlay, { once: true });
            audio.addEventListener('error', onError, { once: true });
            audio.preload = 'auto';
            audio.src = audioUrl;
            audio.load();
          });

          setTTSLoading(false);

          await new Promise<void>((resolve) => {
            const playTimeout = setTimeout(() => { audio.pause(); resolve(); }, 30000);
            audio.onended = () => { clearTimeout(playTimeout); resolve(); };
            audio.onerror = () => { clearTimeout(playTimeout); resolve(); };
            audio.play().catch(() => { clearTimeout(playTimeout); resolve(); });
          });
        }
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('TTS error:', error);
    } finally {
      setIsPlaying(false);
      setTTSLoading(false);
      isPlayingRef.current = false;
    }
  };

  const extractCompleteSentences = (text: string): { sentences: string[]; remaining: string } => {
    const sentencePattern = /[^.!?]*[.!?]+(?:\s|$)/g;
    const matches = text.match(sentencePattern) || [];
    const sentences = matches.map(s => s.trim()).filter(s => s.length > 0);

    let remaining = text;
    for (const sentence of sentences) {
      const idx = remaining.indexOf(sentence);
      if (idx !== -1) remaining = remaining.slice(idx + sentence.length);
    }

    return { sentences, remaining: remaining.trim() };
  };

  const queueTTS = (sentence: string) => {
    if (processedSentencesRef.current.has(sentence)) return;
    processedSentencesRef.current.add(sentence);

    if (!isPlayingQueueRef.current) {
      queueAbortRef.current?.abort();
      queueAbortRef.current = new AbortController();
    }

    prefetchAudio(sentence, queueAbortRef.current?.signal);
    audioQueueRef.current.push(sentence);

    if (!isPlayingQueueRef.current) playNextInQueue();
  };

  const clearQueue = () => {
    audioQueueRef.current = [];
    processedSentencesRef.current.clear();
    audioCacheRef.current.clear();
  };

  return {
    isPlaying,
    setIsPlaying,
    ttsLoading,
    streamingText,
    setStreamingText,
    playTTS,
    extractCompleteSentences,
    queueTTS,
    stopFiller,
    prefetchAudio,
    clearQueue,
    audioRef,
    fillerAudioRef,
    ttsAbortRef,
    queueAbortRef,
    audioQueueRef,
    isPlayingQueueRef,
    processedSentencesRef,
    audioCacheRef,
  };
}
