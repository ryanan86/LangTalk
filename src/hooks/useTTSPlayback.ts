'use client';

import { useState, useRef } from 'react';

// --- IndexedDB Audio Cache ---
const TTS_CACHE_DB = 'taptalk-tts-cache';
const TTS_CACHE_STORE = 'audio';
const TTS_CACHE_MAX_ENTRIES = 200;

function getCacheKey(text: string, voice: string): string {
  return `${voice}:${text.slice(0, 100)}`;
}

function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TTS_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TTS_CACHE_STORE)) {
        db.createObjectStore(TTS_CACHE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedAudio(key: string): Promise<Blob | null> {
  try {
    const db = await openCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(TTS_CACHE_STORE, 'readonly');
      const store = tx.objectStore(TTS_CACHE_STORE);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCachedAudio(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(TTS_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(TTS_CACHE_STORE);

    // Check entry count and evict oldest if over limit
    const countRequest = store.count();
    await new Promise<void>((resolve) => {
      countRequest.onsuccess = () => {
        if (countRequest.result >= TTS_CACHE_MAX_ENTRIES) {
          // Delete the first (oldest) key to make room
          const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
              cursor.delete();
            }
            resolve();
          };
          cursorRequest.onerror = () => resolve();
        } else {
          resolve();
        }
      };
      countRequest.onerror = () => resolve();
    });

    store.put(blob, key);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail — Safari Private Mode, quota exceeded, etc.
  }
}

// --- Hook ---

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

    const cacheKey = getCacheKey(sentence, voice);

    const promise = (async () => {
      // Check IndexedDB cache first
      const cached = await getCachedAudio(cacheKey);
      if (cached) return cached;

      // Fetch from API with streaming enabled
      const res = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TTS-Stream': '1',
        },
        body: JSON.stringify({ text: sentence, voice }),
        signal,
      });
      if (!res.ok) throw new Error(`TTS API error: ${res.status}`);

      // Stream the response — collect chunks as they arrive
      if (res.body) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
        setCachedAudio(cacheKey, blob).catch(() => {});
        return blob;
      }

      // Fallback: non-streaming
      const blob = await res.blob();

      // Store in IndexedDB (background, don't block)
      setCachedAudio(cacheKey, blob).catch(() => {});

      return blob;
    })();

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
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              console.warn('Audio load timeout - skipping sentence');
              reject(new Error('Audio load timeout'));
            }, 8000);

            const onCanPlay = () => {
              clearTimeout(loadTimeout);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              clearTimeout(loadTimeout);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load failed'));
            };

            audio.addEventListener('canplay', onCanPlay, { once: true });
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
      const cacheKey = getCacheKey(text, voice);
      let audioBlob: Blob | null = null;

      // Check IndexedDB cache first
      audioBlob = await getCachedAudio(cacheKey);

      if (!audioBlob) {
        const response = await fetch('/api/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-TTS-Stream': '1',
          },
          body: JSON.stringify({ text, voice, ...(speed && { speed }) }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error('TTS API error:', response.status);
          return;
        }

        // Stream the response for faster first-byte
        if (response.body) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          audioBlob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
        } else {
          audioBlob = await response.blob();
        }

        // Store in IndexedDB (background, don't block)
        setCachedAudio(cacheKey, audioBlob).catch(() => {});
      } else {
        clearTimeout(timeoutId);
      }

      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        if (audioRef.current) {
          const audio = audioRef.current;

          await new Promise<void>((resolve, reject) => {
            const loadTimeout = setTimeout(() => {
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load timeout'));
            }, 10000);

            const onCanPlay = () => {
              clearTimeout(loadTimeout);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              clearTimeout(loadTimeout);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load failed'));
            };

            audio.addEventListener('canplay', onCanPlay, { once: true });
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
