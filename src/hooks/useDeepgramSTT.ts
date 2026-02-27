'use client';

import { useRef, useCallback } from 'react';

interface UseDeepgramSTTReturn {
  connectDeepgram: () => Promise<void>;
  closeDeepgram: () => void;
  sendToDeepgram: (data: Blob) => void;
  realtimeTranscriptRef: React.MutableRefObject<string>;
}

export function useDeepgramSTT(): UseDeepgramSTTReturn {
  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const realtimeTranscriptRef = useRef<string>('');
  const deepgramKeyRef = useRef<string | null>(null);

  const connectDeepgram = useCallback(async (): Promise<void> => {
    try {
      // Fetch a fresh temporary token each time (tokens expire after 60s)
      const res = await fetch('/api/deepgram-token');
      if (!res.ok) return;
      const { key } = await res.json();
      if (!key) return;
      deepgramKeyRef.current = key;

      realtimeTranscriptRef.current = '';
      const apiKey = deepgramKeyRef.current!;

      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true&interim_results=false&endpointing=300',
        ['token', apiKey]
      );

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'Results' && data.is_final) {
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            if (transcript) {
              realtimeTranscriptRef.current += (realtimeTranscriptRef.current ? ' ' : '') + transcript;
            }
          }
        } catch { /* ignore parse errors */ }
      };

      socket.onerror = () => {
        console.warn('Deepgram WebSocket error - will fallback to Whisper');
      };

      deepgramSocketRef.current = socket;

      // Wait for connection to open (max 3 seconds)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 3000);
        socket.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    } catch {
      console.warn('Deepgram connection failed - will use Whisper fallback');
    }
  }, []);

  const closeDeepgram = useCallback(() => {
    const socket = deepgramSocketRef.current;
    if (socket) {
      try {
        if (socket.readyState === WebSocket.OPEN) {
          // Send close signal to Deepgram
          socket.send(JSON.stringify({ type: 'CloseStream' }));
        }
        socket.close();
      } catch { /* ignore */ }
      deepgramSocketRef.current = null;
    }
  }, []);

  const sendToDeepgram = useCallback((data: Blob) => {
    const socket = deepgramSocketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }, []);

  return {
    connectDeepgram,
    closeDeepgram,
    sendToDeepgram,
    realtimeTranscriptRef,
  };
}
