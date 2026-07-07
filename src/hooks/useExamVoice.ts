'use client';

import { useCallback, useRef, useState } from 'react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useDeepgramSTT } from '@/hooks/useDeepgramSTT';

interface UseExamVoiceReturn {
  isRecording: boolean;
  isProcessingSTT: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

interface UseExamVoiceOptions {
  onTranscript: (transcript: string) => void;
}

/**
 * Exam-scoped voice hook — recording + Deepgram STT only (no TTS, no chat).
 * Composes useAudioRecording + useDeepgramSTT directly, matching the pattern
 * used in useStudyVoice but stripped of the TTS/chat plumbing not needed in exam.
 */
export function useExamVoice({ onTranscript }: UseExamVoiceOptions): UseExamVoiceReturn {
  const { connectDeepgram, closeDeepgram, sendToDeepgram, realtimeTranscriptRef } = useDeepgramSTT();

  const [isProcessingSTT, setIsProcessingSTT] = useState(false);

  // Unused refs required by useAudioRecording signature
  const aiFinishedSpeakingTimeRef = useRef<number>(0);
  const responseTimesRef = useRef<number[]>([]);
  const userSpeakingTimeRef = useRef<number>(0);

  const onRecordingComplete = useCallback(async (audioBlob: Blob, dgTranscript: string) => {
    // Prefer Deepgram realtime; fall back to Whisper STT if empty
    if (dgTranscript && dgTranscript.trim()) {
      onTranscript(dgTranscript.trim());
      return;
    }

    if (!audioBlob || audioBlob.size < 100) {
      onTranscript('');
      return;
    }

    setIsProcessingSTT(true);
    try {
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', file);
      const res = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
      if (!res.ok) {
        onTranscript('');
        return;
      }
      const data = await res.json();
      onTranscript((data.text || '').trim());
    } catch {
      onTranscript('');
    } finally {
      setIsProcessingSTT(false);
    }
  }, [onTranscript]);

  const recording = useAudioRecording({
    onInitialRecordingComplete: onRecordingComplete,
    onReplyRecordingComplete: onRecordingComplete,
    connectDeepgram,
    sendToDeepgram,
    closeDeepgram,
    realtimeTranscriptRef,
    aiFinishedSpeakingTimeRef,
    responseTimesRef,
    userSpeakingTimeRef,
  });

  const startRecording = useCallback(async () => {
    await recording.recordReply();
  }, [recording]);

  const stopRecording = useCallback(() => {
    if (recording.isRecordingReply) {
      recording.stopRecording();
    }
  }, [recording]);

  return {
    isRecording: recording.isRecordingReply,
    isProcessingSTT,
    startRecording,
    stopRecording,
  };
}
