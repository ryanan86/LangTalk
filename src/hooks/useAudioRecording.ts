'use client';

import { useState, useRef, useCallback } from 'react';

interface UseAudioRecordingOptions {
  onInitialRecordingComplete: (audioBlob: Blob, transcript: string) => void;
  onReplyRecordingComplete: (audioBlob: Blob, transcript: string) => void;
  onRecordingStarted?: () => void;
  onStopRecordingStart?: () => void;
  connectDeepgram: () => Promise<void>;
  sendToDeepgram: (data: Blob) => void;
  closeDeepgram: () => void;
  realtimeTranscriptRef: React.MutableRefObject<string>;
  aiFinishedSpeakingTimeRef: React.MutableRefObject<number>;
  responseTimesRef: React.MutableRefObject<number[]>;
  userSpeakingTimeRef: React.MutableRefObject<number>;
}

interface UseAudioRecordingReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  recordReply: () => Promise<void>;
  isRecordingReply: boolean;
  setIsRecordingReply: React.Dispatch<React.SetStateAction<boolean>>;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
}

export function useAudioRecording(options: UseAudioRecordingOptions): UseAudioRecordingReturn {
  const {
    onInitialRecordingComplete,
    onReplyRecordingComplete,
    onRecordingStarted,
    connectDeepgram,
    sendToDeepgram,
    closeDeepgram,
    realtimeTranscriptRef,
    aiFinishedSpeakingTimeRef,
    responseTimesRef,
    userSpeakingTimeRef,
  } = options;

  // Stable ref for callback options — avoids stale closures in useCallback([])
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isRecordingReply, setIsRecordingReply] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initialRecordingStoppedRef = useRef(false);

  const startRecording = async () => {
    initialRecordingStoppedRef.current = false;
    try {
      // Start mic and Deepgram connection in parallel
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        connectDeepgram(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          sendToDeepgram(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (initialRecordingStoppedRef.current) return;
        initialRecordingStoppedRef.current = true;
        stream.getTracks().forEach(track => track.stop());

        // Close Deepgram and grab transcript
        closeDeepgram();
        const dgTranscript = realtimeTranscriptRef.current.trim();
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        onInitialRecordingComplete(audioBlob, dgTranscript);
      };

      mediaRecorder.start(250); // 250ms chunks for real-time streaming
      setTimeLeft(0);
      if (onRecordingStarted) onRecordingStarted();
    } catch (error) {
      console.error('Microphone error:', error);
      alert('Please allow microphone access.');
    }
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    const opts = optionsRef.current;

    // Notify parent to transition phase/state immediately for instant visual feedback
    if (opts.onStopRecordingStart) opts.onStopRecordingStart();

    try {
      if (recorder.state === 'recording' || recorder.state === 'paused') {
        recorder.stop();
      }
    } catch {
      // ignore recorder stop errors
    }

    // Fallback: if onstop doesn't fire within 2 seconds (Android bug),
    // force stop tracks and proceed
    setTimeout(() => {
      if (!initialRecordingStoppedRef.current) {
        console.warn('onstop did not fire, forcing fallback');
        initialRecordingStoppedRef.current = true;
        // Stop all media tracks
        try {
          recorder.stream?.getTracks().forEach(track => track.stop());
        } catch { /* ignore */ }
        // Close Deepgram
        opts.closeDeepgram();
        const dgTranscript = opts.realtimeTranscriptRef.current.trim();
        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        opts.onInitialRecordingComplete(audioBlob, dgTranscript);
      }
    }, 2000);
  }, []);

  const recordReply = async () => {
    if (isRecordingReply) {
      stopRecording();
      setIsRecordingReply(false);
      return;
    }

    // Calculate response time (time since AI finished speaking)
    if (aiFinishedSpeakingTimeRef.current > 0) {
      const responseTime = (Date.now() - aiFinishedSpeakingTimeRef.current) / 1000;
      responseTimesRef.current.push(responseTime);
    }

    // Track user speaking start time
    const speakingStartTime = Date.now();

    try {
      // Start mic and Deepgram connection in parallel
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        connectDeepgram(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setIsRecordingReply(true);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          sendToDeepgram(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecordingReply(false);
        // Track user speaking time
        const speakingDuration = (Date.now() - speakingStartTime) / 1000;
        userSpeakingTimeRef.current += speakingDuration;

        stream.getTracks().forEach(track => track.stop());

        // Close Deepgram and grab transcript
        closeDeepgram();
        const dgTranscript = realtimeTranscriptRef.current.trim();
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        onReplyRecordingComplete(audioBlob, dgTranscript);
      };

      mediaRecorder.start(250); // 250ms chunks for real-time streaming
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecordingReply(false);
    }
  };

  return {
    startRecording,
    stopRecording,
    recordReply,
    isRecordingReply,
    setIsRecordingReply,
    timeLeft,
    setTimeLeft,
  };
}
