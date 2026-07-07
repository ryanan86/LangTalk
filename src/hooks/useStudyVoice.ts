'use client';

import { useCallback, useRef, useState } from 'react';
import { useTTSPlayback } from '@/hooks/useTTSPlayback';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useDeepgramSTT } from '@/hooks/useDeepgramSTT';
import type { StudyBlockType } from '@/lib/studyTypes';

export interface StudyChatContext {
  weekTheme: string;
  patterns: { pattern: string; meaningKo: string; examples: string[] }[];
  targetWords?: string[];
  dailyMinutes: number;
  goal: string;
}

export interface StudyMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseStudyVoiceOptions {
  voice: string;
  tutorId: string;
}

interface RecordOptions {
  /** Called with the recognized transcript once recording stops + STT resolves. */
  onTranscript: (transcript: string) => void;
}

/**
 * Voice mechanics for study sessions. Reuses the exact TTS/STT/recording plumbing
 * from the talk page (Deepgram scoped-key streaming STT + streaming TTS cache),
 * and adds a study-scoped chat caller (POST /api/chat mode:'study').
 */
export function useStudyVoice({ voice, tutorId }: UseStudyVoiceOptions) {
  const aiFinishedSpeakingTimeRef = useRef<number>(0);
  const tts = useTTSPlayback({
    voice,
    onQueueEnd: () => {
      aiFinishedSpeakingTimeRef.current = Date.now();
    },
  });

  const { connectDeepgram, closeDeepgram, sendToDeepgram, realtimeTranscriptRef } = useDeepgramSTT();

  // Unused speaking/response metrics required by the recording hook signature.
  const responseTimesRef = useRef<number[]>([]);
  const userSpeakingTimeRef = useRef<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSTT, setIsProcessingSTT] = useState(false);
  const transcriptCbRef = useRef<((t: string) => void) | null>(null);

  const finishTranscript = useCallback(async (audioBlob: Blob, transcript: string) => {
    setIsRecording(false);
    const cb = transcriptCbRef.current;
    transcriptCbRef.current = null;

    // Prefer Deepgram realtime transcript; fall back to Whisper if empty.
    if (transcript && transcript.trim()) {
      cb?.(transcript.trim());
      return;
    }

    if (!audioBlob || audioBlob.size < 100) {
      cb?.('');
      return;
    }

    setIsProcessingSTT(true);
    try {
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', file);
      const res = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
      if (!res.ok) {
        cb?.('');
        return;
      }
      const data = await res.json();
      cb?.((data.text || '').trim());
    } catch (e) {
      console.error('Study STT error:', e);
      cb?.('');
    } finally {
      setIsProcessingSTT(false);
    }
  }, []);

  const { recordReply } = useAudioRecording({
    onInitialRecordingComplete: finishTranscript,
    onReplyRecordingComplete: finishTranscript,
    connectDeepgram,
    sendToDeepgram,
    closeDeepgram,
    realtimeTranscriptRef,
    aiFinishedSpeakingTimeRef,
    responseTimesRef,
    userSpeakingTimeRef,
  });

  /** Toggle recording; resolves the transcript via onTranscript. */
  const toggleRecord = useCallback(async (opts: RecordOptions) => {
    if (isRecording) {
      // recordReply() toggles stop when already recording.
      await recordReply();
      return;
    }
    transcriptCbRef.current = opts.onTranscript;
    setIsRecording(true);
    await recordReply();
  }, [isRecording, recordReply]);

  /**
   * Call the study chat endpoint (non-streaming consumption but streaming request)
   * and play the reply via TTS. Returns the assistant reply text.
   */
  const sendStudyChat = useCallback(async (
    studyBlock: StudyBlockType,
    studyContext: StudyChatContext,
    messages: StudyMessage[],
  ): Promise<string> => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          tutorId,
          mode: 'study',
          studyBlock,
          studyContext,
          stream: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get('content-type');
      let reply = '';

      if (contentType?.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) reply += parsed.text;
            } catch { /* ignore */ }
          }
        }
      } else {
        const data = await res.json();
        reply = data.message || data.text || '';
      }

      reply = reply.trim();
      if (reply) await tts.playTTS(reply);
      return reply;
    } catch (e) {
      console.error('Study chat error:', e);
      return '';
    }
  }, [tutorId, tts]);

  return {
    // TTS
    playTTS: tts.playTTS,
    isPlaying: tts.isPlaying,
    ttsLoading: tts.ttsLoading,
    audioRef: tts.audioRef,
    fillerAudioRef: tts.fillerAudioRef,
    setIsPlaying: tts.setIsPlaying,
    // Recording / STT
    toggleRecord,
    isRecording,
    isProcessingSTT,
    // Chat
    sendStudyChat,
  };
}
