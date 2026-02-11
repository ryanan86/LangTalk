'use client';

import type { Language } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';

interface MicTestStepProps {
  onComplete: () => void;
  onSkip: () => void;
  language: Language;
}

type TestStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'success' | 'error';

export default function MicTestStep({ onComplete, onSkip, language }: MicTestStepProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startMicTest = async () => {
    setTestResult(null);
    setTestStatus('requesting');
    setRecordingProgress(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setTestStatus('recording');

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
        }
      };

      mediaRecorder.onstop = async () => {
        setTestStatus('processing');
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size < 1000) {
          setTestResult(
            language === 'ko'
              ? '오디오가 녹음되지 않았습니다. 마이크를 확인해주세요.'
              : 'No audio recorded. Please check your microphone.'
          );
          setTestStatus('error');
          return;
        }

        try {
          const file = new File([audioBlob], 'test.webm', { type: mimeType });
          const formData = new FormData();
          formData.append('audio', file);

          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (data.error) {
            setTestResult(
              language === 'ko' ? `오류: ${data.error}` : `Error: ${data.error}`
            );
            setTestStatus('error');
          } else if (data.text && data.text.trim()) {
            setTestResult(data.text);
            setTestStatus('success');
          } else {
            setTestResult(
              language === 'ko'
                ? '음성이 인식되지 않았습니다. 더 크게 말해주세요.'
                : 'No speech detected. Please speak louder.'
            );
            setTestStatus('error');
          }
        } catch {
          setTestResult(
            language === 'ko'
              ? '오디오 처리 중 오류가 발생했습니다.'
              : 'Error processing audio. Please try again.'
          );
          setTestStatus('error');
        }
      };

      mediaRecorder.start(1000);

      // Progress bar for 3-second recording
      let progress = 0;
      progressIntervalRef.current = setInterval(() => {
        progress += 100 / 30; // 30 ticks over 3 seconds (100ms interval)
        setRecordingProgress(Math.min(progress, 100));
      }, 100);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);
    } catch {
      setTestResult(
        language === 'ko'
          ? '마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.'
          : 'Microphone access denied. Please allow microphone access in your browser settings.'
      );
      setTestStatus('error');
    }
  };

  const resetTest = () => {
    setTestStatus('idle');
    setTestResult(null);
    setRecordingProgress(0);
  };

  return (
    <div className="flex flex-col items-center text-center px-4">
      {/* Animated Microphone Icon */}
      <div className="relative mb-8">
        <div
          className={`
            w-32 h-32 rounded-full flex items-center justify-center
            transition-all duration-500
            ${testStatus === 'recording'
              ? 'bg-red-500/20 dark:bg-red-500/20'
              : testStatus === 'success'
                ? 'bg-green-500/20 dark:bg-green-500/20'
                : testStatus === 'error'
                  ? 'bg-red-500/10 dark:bg-red-500/10'
                  : 'bg-primary-500/10 dark:bg-primary-500/10'
            }
          `}
        >
          {/* Pulsing rings during recording */}
          {testStatus === 'recording' && (
            <>
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <div
                className="absolute inset-0 rounded-full bg-red-500/10"
                style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
              />
            </>
          )}

          {testStatus === 'success' ? (
            // Green checkmark
            <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : testStatus === 'processing' ? (
            // Spinner
            <svg className="w-12 h-12 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            // Microphone icon
            <svg
              className={`w-12 h-12 transition-colors duration-300 ${
                testStatus === 'recording'
                  ? 'text-red-500'
                  : testStatus === 'error'
                    ? 'text-red-400'
                    : 'text-primary-500'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </div>

        {/* Recording progress ring */}
        {testStatus === 'recording' && (
          <svg
            className="absolute inset-0 w-32 h-32 -rotate-90"
            viewBox="0 0 128 128"
          >
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-neutral-200 dark:text-neutral-700"
            />
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-red-500"
              style={{
                strokeDasharray: `${2 * Math.PI * 60}`,
                strokeDashoffset: `${2 * Math.PI * 60 * (1 - recordingProgress / 100)}`,
                transition: 'stroke-dashoffset 100ms linear',
              }}
            />
          </svg>
        )}
      </div>

      {/* Status Text */}
      <div className="mb-6 min-h-[80px] flex flex-col items-center justify-center">
        {testStatus === 'idle' && (
          <>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {language === 'ko' ? '마이크 테스트' : 'Microphone Test'}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
              {language === 'ko'
                ? '마이크가 제대로 작동하는지 확인해보세요. 아무 말이나 3초간 녹음합니다.'
                : 'Let\'s make sure your microphone works. We\'ll record for 3 seconds.'}
            </p>
          </>
        )}

        {testStatus === 'requesting' && (
          <p className="text-sm text-primary-500 font-medium">
            {language === 'ko' ? '마이크 권한을 요청하는 중...' : 'Requesting microphone permission...'}
          </p>
        )}

        {testStatus === 'recording' && (
          <>
            <h3 className="text-lg font-semibold text-red-500 mb-2 animate-pulse">
              {language === 'ko' ? '녹음 중...' : 'Recording...'}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {language === 'ko' ? '지금 말해보세요!' : 'Speak now!'}
            </p>
          </>
        )}

        {testStatus === 'processing' && (
          <p className="text-sm text-primary-500 font-medium">
            {language === 'ko' ? '처리 중...' : 'Processing...'}
          </p>
        )}

        {testStatus === 'success' && (
          <>
            <h3 className="text-lg font-semibold text-green-500 mb-2">
              {language === 'ko' ? '마이크가 정상 작동합니다!' : 'Your microphone works!'}
            </h3>
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl px-4 py-3 max-w-xs">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                {language === 'ko' ? '인식된 내용:' : 'We heard:'}
              </p>
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                &ldquo;{testResult}&rdquo;
              </p>
            </div>
          </>
        )}

        {testStatus === 'error' && (
          <>
            <h3 className="text-lg font-semibold text-red-500 mb-2">
              {language === 'ko' ? '다시 시도해주세요' : 'Let\'s try again'}
            </h3>
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3 max-w-xs">
              <p className="text-sm text-red-700 dark:text-red-300">{testResult}</p>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {testStatus === 'idle' && (
          <button
            onClick={startMicTest}
            className="btn-primary py-3 text-base w-full"
          >
            {language === 'ko' ? '마이크 테스트 시작' : 'Start Mic Test'}
          </button>
        )}

        {testStatus === 'success' && (
          <button
            onClick={onComplete}
            className="btn-primary py-3 text-base w-full"
          >
            {language === 'ko' ? '다음으로' : 'Continue'}
          </button>
        )}

        {testStatus === 'error' && (
          <button
            onClick={resetTest}
            className="btn-primary py-3 text-base w-full"
          >
            {language === 'ko' ? '다시 테스트' : 'Try Again'}
          </button>
        )}

        {(testStatus === 'idle' || testStatus === 'error') && (
          <button
            onClick={onSkip}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors py-2"
          >
            {language === 'ko' ? '나중에 할게요' : 'I\'ll do this later'}
          </button>
        )}
      </div>
    </div>
  );
}
