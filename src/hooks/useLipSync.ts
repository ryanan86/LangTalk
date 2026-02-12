'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export interface MouthShape {
  open: number;   // 0-1: jaw openness (vertical)
  wide: number;   // 0-1: mouth width (horizontal)
}

const DEAD_ZONE = 0.05;       // Ignore tiny values (noise) - GPT recommended 0.01-0.1
const CLOSE_SPEED = 0.08;     // Gradual close per frame (smooth shut)
const FRAME_SKIP = 2;         // Update React state every N frames (~30fps)

/**
 * Custom lip-sync hook using Web Audio API.
 * Analyzes TTS audio frequency bands in real-time.
 *
 * Optimized for Fish Audio s1 model (mp3 128kbps output).
 * Cost: $0, Latency: 0ms, Dependencies: 0
 */
export function useLipSync() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef(false);
  const frameCountRef = useRef(0);

  const [mouthShape, setMouthShape] = useState<MouthShape>({ open: 0, wide: 0 });

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
      analyser.fftSize = 1024;              // 512 bins, ~43Hz per bin at 44.1kHz (GPT: 1024 optimal)
      analyser.smoothingTimeConstant = 0.5;  // Balanced smoothing
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(ctx.destination);

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

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    frameCountRef.current = 0;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount); // 512 bins

    // At 44100Hz with fftSize=1024: each bin = ~43Hz
    // GPT recommended voice range: 300-3400Hz
    // Bin 7-12  = ~301-516Hz  (fundamental voice, vowel F1 formant)
    // Bin 13-45 = ~559-1935Hz (consonant energy, F2 formant transitions)
    // Bin 46-79 = ~1978-3397Hz (sibilants, F3 high consonants)
    const LOW_START = 7;
    const LOW_END = 12;
    const MID_START = 13;
    const MID_END = 45;
    const HIGH_START = 46;
    const HIGH_END = 79;

    const update = () => {
      analyser.getByteFrequencyData(dataArray);

      // Band energies
      let lowSum = 0;
      for (let i = LOW_START; i <= LOW_END; i++) lowSum += dataArray[i];
      const lowAvg = lowSum / (LOW_END - LOW_START + 1);

      let midSum = 0;
      for (let i = MID_START; i <= MID_END; i++) midSum += dataArray[i];
      const midAvg = midSum / (MID_END - MID_START + 1);

      let highSum = 0;
      for (let i = HIGH_START; i <= HIGH_END; i++) highSum += dataArray[i];
      const highAvg = highSum / (HIGH_END - HIGH_START + 1);

      // Composite openness: weighted blend of low + mid (high adds punch)
      const rawEnergy = lowAvg * 0.5 + midAvg * 0.35 + highAvg * 0.15;
      const rawOpen = Math.min(1, Math.max(0, (rawEnergy - 20) / 65));
      const rawWide = Math.min(1, Math.max(0, (midAvg - 15) / 55));

      // Apply dead zone
      const open = rawOpen < DEAD_ZONE ? 0 : rawOpen;
      const wide = rawWide < DEAD_ZONE ? 0 : rawWide;

      // Exponential smoothing (quick attack, slower release for natural feel)
      const attackOpen = 0.55;
      const releaseOpen = 0.18;
      const attackWide = 0.5;
      const releaseWide = 0.15;

      const openFactor = open > prevOpenRef.current ? attackOpen : releaseOpen;
      const wideFactor = wide > prevWideRef.current ? attackWide : releaseWide;

      const smoothOpen = prevOpenRef.current + (open - prevOpenRef.current) * openFactor;
      const smoothWide = prevWideRef.current + (wide - prevWideRef.current) * wideFactor;

      prevOpenRef.current = smoothOpen;
      prevWideRef.current = smoothWide;

      // Throttle React state updates to every Nth frame (~30fps)
      frameCountRef.current++;
      if (frameCountRef.current % FRAME_SKIP === 0) {
        setMouthShape({ open: smoothOpen, wide: smoothWide });
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
  }, []);

  /**
   * Stop analysing with gradual mouth close.
   */
  const stopAnalysis = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    // Gradual close animation
    const closeAnimation = () => {
      const newOpen = prevOpenRef.current * (1 - CLOSE_SPEED * 3);
      const newWide = prevWideRef.current * (1 - CLOSE_SPEED * 3);

      if (newOpen < 0.01 && newWide < 0.01) {
        prevOpenRef.current = 0;
        prevWideRef.current = 0;
        setMouthShape({ open: 0, wide: 0 });
        return;
      }

      prevOpenRef.current = newOpen;
      prevWideRef.current = newWide;
      setMouthShape({ open: newOpen, wide: newWide });
      requestAnimationFrame(closeAnimation);
    };

    requestAnimationFrame(closeAnimation);
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
    connectAudio,
    startAnalysis,
    stopAnalysis,
  };
}
