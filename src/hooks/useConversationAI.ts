'use client';

import { useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseConversationAIOptions {
  tutorId: string;
  /** TTS functions from useTTSPlayback */
  queueTTS: (sentence: string) => void;
  extractCompleteSentences: (text: string) => { sentences: string[]; remaining: string };
  clearQueue: () => void;
  playTTS: (text: string, speed?: number) => Promise<void>;
  /** Audio queue refs from useTTSPlayback */
  audioQueueRef: React.MutableRefObject<string[]>;
  isPlayingQueueRef: React.MutableRefObject<boolean>;
  /** State setters */
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setStreamingText: (v: string) => void;
  setIsProcessing: (v: boolean) => void;
  setIsPlaying: (v: boolean) => void;
  setShowTranscript: (v: boolean) => void;
  /** Session ending ref */
  isEndingSessionRef: React.MutableRefObject<boolean>;
}

interface UseConversationAIReturn {
  getAIResponse: (currentMessages: Message[]) => Promise<void>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

export function useConversationAI({
  tutorId,
  queueTTS,
  extractCompleteSentences,
  clearQueue,
  playTTS,
  audioQueueRef,
  isPlayingQueueRef,
  setMessages,
  setStreamingText,
  setIsProcessing,
  setIsPlaying,
  setShowTranscript,
  isEndingSessionRef,
}: UseConversationAIOptions): UseConversationAIReturn {
  const abortControllerRef = useRef<AbortController | null>(null);

  const getAIResponse = useCallback(async (currentMessages: Message[]) => {
    setIsProcessing(true);

    // Reset streaming state
    setStreamingText('');
    setShowTranscript(false); // Hide text by default for listening practice
    clearQueue();

    // Create AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const MAX_MESSAGES = 10;
      let messagesToSend = currentMessages;

      if (currentMessages.length > MAX_MESSAGES) {
        const firstMessage = currentMessages[0];
        const recentMessages = currentMessages.slice(-MAX_MESSAGES + 1);
        messagesToSend = [firstMessage, ...recentMessages];
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          tutorId,
          mode: 'interview',
          stream: true,
        }),
        signal: controller.signal,
      });

      // Check if response is streaming (SSE)
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/event-stream')) {
        // Process streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let textBuffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  // Stream complete - add any remaining text
                  if (textBuffer.trim()) {
                    queueTTS(textBuffer.trim());
                  }
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    fullResponse += parsed.text;
                    textBuffer += parsed.text;
                    setStreamingText(fullResponse);

                    // Extract and queue complete sentences
                    const { sentences, remaining } = extractCompleteSentences(textBuffer);
                    for (const sentence of sentences) {
                      queueTTS(sentence);
                    }
                    textBuffer = remaining;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        }

        // Add completed message to conversation
        if (fullResponse) {
          const assistantMessage: Message = { role: 'assistant', content: fullResponse };
          setMessages(prev => [...prev, assistantMessage]);
        }

        // Wait for all audio to finish playing (max 30 seconds)
        const audioWaitStart = Date.now();
        while ((isPlayingQueueRef.current || audioQueueRef.current.length > 0) && !isEndingSessionRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (Date.now() - audioWaitStart > 30000) {
            console.warn('Audio queue wait timeout - forcing continue');
            audioQueueRef.current = [];
            isPlayingQueueRef.current = false;
            setIsPlaying(false);
            break;
          }
        }

        setStreamingText('');
      } else {
        // Fallback to non-streaming response
        const data = await response.json();

        if (data.message) {
          const assistantMessage: Message = { role: 'assistant', content: data.message };
          setMessages(prev => [...prev, assistantMessage]);
          await playTTS(data.message);
        }
      }
    } catch (error) {
      if (!isEndingSessionRef.current) {
        console.error('AI response error:', error);
      }
    } finally {
      // Don't override isProcessing if session is ending (getAnalysis sets its own state)
      if (!isEndingSessionRef.current) {
        setIsProcessing(false);
      }
    }
  }, [
    tutorId,
    queueTTS,
    extractCompleteSentences,
    clearQueue,
    playTTS,
    audioQueueRef,
    isPlayingQueueRef,
    setMessages,
    setStreamingText,
    setIsProcessing,
    setIsPlaying,
    setShowTranscript,
    isEndingSessionRef,
  ]);

  return {
    getAIResponse,
    abortControllerRef,
  };
}
