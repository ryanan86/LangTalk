'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export interface MouthShape {
  open: number;   // 0-1: jaw openness (vertical)
  wide: number;   // 0-1: mouth width (horizontal)
}

/**
 * Custom lip-sync hook using Web Audio API.
 * Analyzes audio frequency bands in real-time to produce mouth shape parameters.
 *
 * - Low frequencies (200-800Hz) -> jaw openness (vowels open the jaw)
 * - Mid frequencies (800-3000Hz) -> mouth width (consonants spread the mouth)
 *
 * Cost: $0, Latency: 0ms, Dependencies: 0
 */
export function useLipSync() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef(false);

  const [mouthShape, setMouthShape] = useState<MouthShape>({ open: 0, wide: 0 });
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Smoothing state (refs to avoid re-renders)
  const prevOpenRef = useRef(0);
  const prevWideRef = useRef(0);

  /**
   * Connect to an HTMLAudioElement. Call once after user gesture.
   * createMediaElementSource can only be called once per element.
   */
  const connectAudio = useCallback((audioElement: HTMLAudioElement) => {
    if (connectedRef.current) return;

    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(ctx.destination); // Pass through to speakers

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      connectedRef.current = true;
    } catch (e) {
      console.warn('LipSync: audio connection failed', e);
    }
  }, []);

  /**
   * Start analysing. Call when TTS audio starts playing.
   */
  const startAnalysis = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    // Resume AudioContext if suspended (iOS requirement)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    setIsAnalysing(true);

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount; // 128 bins
    const dataArray = new Uint8Array(bufferLength);

    // At 44100Hz sample rate with fftSize=256:
    // Each bin = 44100/256 = ~172Hz
    // Bin 1-4 = ~172-688Hz (low vowel energy)
    // Bin 5-17 = ~860-2924Hz (mid consonant energy)
    const LOW_START = 1;
    const LOW_END = 4;
    const MID_START = 5;
    const MID_END = 17;

    const update = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate band energies
      let lowSum = 0;
      for (let i = LOW_START; i <= LOW_END; i++) lowSum += dataArray[i];
      const lowAvg = lowSum / (LOW_END - LOW_START + 1);

      let midSum = 0;
      for (let i = MID_START; i <= MID_END; i++) midSum += dataArray[i];
      const midAvg = midSum / (MID_END - MID_START + 1);

      // Normalize to 0-1 (speech typically falls in 30-120 range)
      const rawOpen = Math.min(1, Math.max(0, (lowAvg - 25) / 70));
      const rawWide = Math.min(1, Math.max(0, (midAvg - 20) / 60));

      // Exponential smoothing (quick attack, slower release)
      const attackFactor = 0.6;
      const releaseFactor = 0.15;

      const openFactor = rawOpen > prevOpenRef.current ? attackFactor : releaseFactor;
      const wideFactor = rawWide > prevWideRef.current ? attackFactor : releaseFactor;

      const smoothOpen = prevOpenRef.current + (rawOpen - prevOpenRef.current) * openFactor;
      const smoothWide = prevWideRef.current + (rawWide - prevWideRef.current) * wideFactor;

      prevOpenRef.current = smoothOpen;
      prevWideRef.current = smoothWide;

      setMouthShape({ open: smoothOpen, wide: smoothWide });

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
  }, []);

  /**
   * Stop analysing. Call when TTS audio stops.
   */
  const stopAnalysis = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setIsAnalysing(false);
    // Smooth close mouth
    prevOpenRef.current = 0;
    prevWideRef.current = 0;
    setMouthShape({ open: 0, wide: 0 });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    mouthShape,
    isAnalysing,
    connectAudio,
    startAnalysis,
    stopAnalysis,
  };
}
