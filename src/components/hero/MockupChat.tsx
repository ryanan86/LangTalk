'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { conversations, type ChatMessage } from './conversationScript';
import MockupTypingIndicator from './MockupTypingIndicator';

interface DisplayMessage extends ChatMessage {
  id: string;
  visible: boolean;
}

export default function MockupChat() {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [conversationIndex, setConversationIndex] = useState(0);
  const [currentTutor, setCurrentTutor] = useState(conversations[0]);
  const [transitioning, setTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutRef.current.push(id);
    return id;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  const playConversation = useCallback(
    (convoIdx: number) => {
      const convo = conversations[convoIdx % conversations.length];
      setCurrentTutor(convo);
      setTransitioning(false);
      setDisplayMessages([]);
      setShowTyping(false);

      let delay = 600;

      convo.messages.forEach((msg, i) => {
        // show typing indicator for AI messages
        if (msg.role === 'ai') {
          addTimeout(() => {
            setShowTyping(true);
            scrollToBottom();
          }, delay);
          delay += 1200;
        }

        // show the message
        addTimeout(() => {
          setShowTyping(false);
          setDisplayMessages((prev) => [
            ...prev,
            { ...msg, id: `${convoIdx}-${i}`, visible: true },
          ]);
          setTimeout(scrollToBottom, 50);
        }, delay);

        delay += msg.role === 'correction' ? 800 : 1000;
      });

      // transition to next conversation
      addTimeout(() => {
        setTransitioning(true);
      }, delay + 2000);

      addTimeout(() => {
        const nextIdx = (convoIdx + 1) % conversations.length;
        setConversationIndex(nextIdx);
      }, delay + 2600);
    },
    [addTimeout, scrollToBottom]
  );

  useEffect(() => {
    clearTimeouts();
    playConversation(conversationIndex);
    return clearTimeouts;
  }, [conversationIndex, playConversation, clearTimeouts]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b border-white/10 transition-opacity duration-500 ${
          transitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentTutor.tutorColor} flex items-center justify-center text-sm`}
        >
          {currentTutor.tutorEmoji}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{currentTutor.tutorName}</div>
          <div className="text-xs text-white/50">AI Tutor · Online</div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-green-400/70">Active</span>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-3 py-3 space-y-2.5 transition-opacity duration-500 ${
          transitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ scrollbarWidth: 'none' }}
      >
        {displayMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[msg-appear_0.3s_ease-out]`}
          >
            {msg.role === 'correction' ? (
              <div className="max-w-[85%] px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] text-amber-400 font-medium">Correction</span>
                </div>
                <p className="text-xs text-white/80">
                  <span className="line-through text-red-400/80">{msg.correctionOriginal}</span>
                  {' → '}
                  <span className="text-green-400 font-medium">{msg.correctionFixed}</span>
                </p>
                <p className="text-[10px] text-white/40 mt-1">{msg.correctionExplanation}</p>
              </div>
            ) : (
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-md'
                    : 'bg-white/10 text-white/90 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
            )}
          </div>
        ))}

        {showTyping && (
          <div className="flex justify-start animate-[msg-appear_0.3s_ease-out]">
            <div className="bg-white/10 rounded-2xl rounded-bl-md">
              <MockupTypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* Decorative input bar */}
      <div className="px-3 pb-3 pt-1">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-full bg-white/5 border border-white/10">
          <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-xs text-white/30">Tap to speak...</span>
          <div className="ml-auto w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
