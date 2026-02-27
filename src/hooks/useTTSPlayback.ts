'use client';

import { useState, useRef } from 'react';

interface UseTTSPlaybackOptions {
  voice: string;
  onQueueEnd?: () => void;
}

interface UseTTSPlaybackReturn {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
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
  const [streamingText, setStreamingText] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const processedSentencesRef = useRef<Set<string>>(new Set());
  const audioCacheRef = useRef<Map<string, Promise<Blob>>>(new Map());
  const fillerAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const queueAbortRef = useRef<AbortController | null>(null);

  // Stop filler audio if still playing
  const stopFiller = () => {
    if (fillerAudioRef.current) {
      fillerAudioRef.current.onended = null;
      fillerAudioRef.current.pause();
      fillerAudioRef.current.currentTime = 0;
    }
  };

  // Prefetch audio for a sentence
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
      if (!res.ok) {
        throw new Error(`TTS API error: ${res.status}`);
      }
      return res.blob();
    });

    audioCacheRef.current.set(sentence, promise);
    return promise;
  };

  // Play next audio in queue
  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setIsPlaying(false);
      // Clear audio cache when done
      audioCacheRef.current.clear();
      // Notify caller that queue playback ended
      onQueueEnd?.();
      return;
    }

    isPlayingQueueRef.current = true;
    setIsPlaying(true);
    // Stop filler audio when real TTS starts
    stopFiller();

    const sentence = audioQueueRef.current.shift()!;

    // Prefetch next sentence while playing current one
    if (audioQueueRef.current.length > 0) {
      prefetchAudio(audioQueueRef.current[0], queueAbortRef.current?.signal);
    }

    try {
      // Use cached audio or fetch if not available
      const audioBlob = await prefetchAudio(sentence, queueAbortRef.current?.signal);
      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        if (audioRef.current) {
          const audio = audioRef.current;

          // Wait for audio to load (with timeout to prevent queue hang)
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

            audio.onended = () => {
              clearTimeout(playTimeout);
              resolve();
            };
            audio.onerror = () => {
              clearTimeout(playTimeout);
              console.warn('Audio play error - skipping');
              resolve();
            };

            audio.play().catch((err) => {
              clearTimeout(playTimeout);
              console.warn('Audio play() rejected:', err);
              resolve();
            });
          });
        }
      } finally {
        // Revoke URL to free memory
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Queue was cancelled — stop processing
        return;
      }
      console.error('TTS queue error:', error);
    }

    // Play next in queue
    playNextInQueue();
  };

  // Single-shot TTS playback
  const playTTS = async (text: string, speed?: number) => {
    // Abort any in-flight TTS request before starting a new one
    ttsAbortRef.current?.abort();
    const controller = new AbortController();
    ttsAbortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), 10000);

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

          // Wait for audio to be fully loaded before playing (with timeout)
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

          // Wait for audio to finish playing (not just start)
          await new Promise<void>((resolve) => {
            const playTimeout = setTimeout(() => {
              audio.pause();
              resolve();
            }, 30000);

            audio.onended = () => {
              clearTimeout(playTimeout);
              resolve();
            };
            audio.onerror = () => {
              clearTimeout(playTimeout);
              resolve();
            };

            audio.play().catch(() => {
              clearTimeout(playTimeout);
              resolve();
            });
          });
        }
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        // Normal cancellation — ignore
        return;
      }
      console.error('TTS error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Extract complete sentences from text buffer
  const extractCompleteSentences = (text: string): { sentences: string[]; remaining: string } => {
    // Match sentences ending with . ! or ? followed by space or end
    const sentencePattern = /[^.!?]*[.!?]+(?:\s|$)/g;
    const matches = text.match(sentencePattern) || [];
    const sentences = matches.map(s => s.trim()).filter(s => s.length > 0);

    // Find remaining text after last complete sentence
    let remaining = text;
    for (const sentence of sentences) {
      const idx = remaining.indexOf(sentence);
      if (idx !== -1) {
        remaining = remaining.slice(idx + sentence.length);
      }
    }

    return { sentences, remaining: remaining.trim() };
  };

  // Add sentence to TTS queue
  const queueTTS = (sentence: string) => {
    // Skip if already processed
    if (processedSentencesRef.current.has(sentence)) {
      return;
    }
    processedSentencesRef.current.add(sentence);

    // Create a new abort controller when starting a fresh queue
    if (!isPlayingQueueRef.current) {
      queueAbortRef.current?.abort();
      queueAbortRef.current = new AbortController();
    }

    // Start prefetching audio immediately
    prefetchAudio(sentence, queueAbortRef.current?.signal);

    audioQueueRef.current.push(sentence);

    if (!isPlayingQueueRef.current) {
      playNextInQueue();
    }
  };

  // Reset queue, cache, processed sentences
  const clearQueue = () => {
    audioQueueRef.current = [];
    processedSentencesRef.current.clear();
    audioCacheRef.current.clear();
  };

  return {
    isPlaying,
    setIsPlaying,
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
