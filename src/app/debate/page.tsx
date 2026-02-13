'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { moderator, debaters } from '@/lib/debatePersonas';
import {
  DebatePhase,
  DebateTeam,
  DebateParticipant,
  DebateTopic,
  DebateMessage,
  DebateAnalysis,
  DebateCategory,
  MIN_DEBATE_TURNS,
  MAX_DEBATE_TURNS,
} from '@/lib/debateTypes';

function DebateContent() {
  const router = useRouter();
  const { t, language } = useLanguage();

  // Phase management
  const [phase, setPhase] = useState<DebatePhase>('topic');
  const [topic, setTopic] = useState<DebateTopic | null>(null);
  const [userTeam, setUserTeam] = useState<DebateTeam | null>(null);

  // Participants
  const [participants, setParticipants] = useState<DebateParticipant[]>([]);
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0);

  // Messages and turns
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [, setUserTurnCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState<string>('');

  // Analysis
  const [analysis, setAnalysis] = useState<DebateAnalysis | null>(null);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUserTurn, setIsUserTurn] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Speaking order for the current phase
  const [speakingOrder, setSpeakingOrder] = useState<DebateParticipant[]>([]);

  // Fetch age-appropriate topics from API
  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/debate-topics');
      const data = await response.json();
      if (data.topics && data.topics.length > 0) {
        // Convert API format to DebateTopic format
        const randomIndex = Math.floor(Math.random() * data.topics.length);
        const apiTopic = data.topics[randomIndex];
        const selectedTopic: DebateTopic = {
          id: apiTopic.id,
          category: apiTopic.category as DebateCategory,
          title: apiTopic.title,
          description: apiTopic.description,
        };
        setTopic(selectedTopic);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      // Fallback to a default topic
      setTopic({
        id: 'default-1',
        category: 'daily',
        title: { en: 'Technology makes life better', ko: '기술이 삶을 더 좋게 만든다' },
        description: { en: 'Discuss whether technology has improved our daily lives.', ko: '기술이 우리의 일상생활을 향상시켰는지 토론합니다.' },
      });
    }
  };

  // Initialize debate
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    initializeDebate();
  }, []);

  const initializeDebate = () => {
    // Fetch topic from API (age-appropriate)
    fetchTopics();

    // Assign user to random team
    const team: DebateTeam = Math.random() < 0.5 ? 'pro' : 'con';
    setUserTeam(team);

    // Shuffle debaters and assign to teams
    const shuffledDebaters = [...debaters].sort(() => Math.random() - 0.5);

    // User's team partner (1 AI)
    const partner = shuffledDebaters[0];
    // Opponents (2 AIs)
    const opponents = [shuffledDebaters[1], shuffledDebaters[2]];

    // Create participant list
    const participantList: DebateParticipant[] = [
      // Moderator
      {
        id: 'moderator',
        name: moderator.name,
        team: 'moderator',
        isUser: false,
        voice: moderator.voice,
        gradient: moderator.gradient,
      },
      // User
      {
        id: 'user',
        name: t.you,
        team: team,
        isUser: true,
        voice: '',
        gradient: 'from-indigo-400 to-purple-500',
      },
      // Partner (same team as user)
      {
        id: partner.id,
        name: partner.name,
        team: team,
        isUser: false,
        voice: partner.voice,
        gradient: partner.gradient,
      },
      // Opponents (opposite team)
      {
        id: opponents[0].id,
        name: opponents[0].name,
        team: team === 'pro' ? 'con' : 'pro',
        isUser: false,
        voice: opponents[0].voice,
        gradient: opponents[0].gradient,
      },
      {
        id: opponents[1].id,
        name: opponents[1].name,
        team: team === 'pro' ? 'con' : 'pro',
        isUser: false,
        voice: opponents[1].voice,
        gradient: opponents[1].gradient,
      },
    ];

    setParticipants(participantList);
  };

  // Progress through phases automatically
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'topic' && topic) {
      // Show topic for 3 seconds, then move to team assignment
      const timer = setTimeout(() => {
        setPhase('team');
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (phase === 'team' && participants.length > 0) {
      // Show teams for 3 seconds, then start opening statements
      const timer = setTimeout(() => {
        startOpeningPhase();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, topic, participants]);

  const startOpeningPhase = () => {
    setPhase('opening');
    // Speaking order for opening: Moderator intro, then Pro1, Con1, Pro2, Con2
    const proTeam = participants.filter(p => p.team === 'pro');
    const conTeam = participants.filter(p => p.team === 'con');

    const order = [
      participants.find(p => p.team === 'moderator')!,
      proTeam[0],
      conTeam[0],
      proTeam[1],
      conTeam[1],
    ].filter(Boolean);

    setSpeakingOrder(order);
    setCurrentSpeakerIndex(0);

    // Start with moderator
    getAIResponse('opening', order[0]);
  };

  const startDebatePhase = () => {
    setPhase('debate');
    setTurnCount(0);

    // Alternating turns between teams
    const proTeam = participants.filter(p => p.team === 'pro');
    const conTeam = participants.filter(p => p.team === 'con');

    // Create alternating order with user having at least 3 turns
    const order: DebateParticipant[] = [];
    const totalTurns = MIN_DEBATE_TURNS + Math.floor(Math.random() * (MAX_DEBATE_TURNS - MIN_DEBATE_TURNS + 1));

    let proIdx = 0;
    let conIdx = 0;
    let userTurns = 0;

    for (let i = 0; i < totalTurns; i++) {
      const isProTurn = i % 2 === (userTeam === 'pro' ? 0 : 1);
      const team = isProTurn ? proTeam : conTeam;

      // Ensure user gets at least 3 turns
      const user = participants.find(p => p.isUser);
      if (user && userTurns < 3 && i >= 2 && (i === 2 || i === 5 || i === 8)) {
        if ((isProTurn && userTeam === 'pro') || (!isProTurn && userTeam === 'con')) {
          order.push(user);
          userTurns++;
          continue;
        }
      }

      // Alternate between team members
      const idx = isProTurn ? proIdx++ % team.length : conIdx++ % team.length;
      order.push(team[idx]);
    }

    setSpeakingOrder(order);
    setCurrentSpeakerIndex(0);

    // Add moderator transition
    const mod = participants.find(p => p.team === 'moderator');
    if (mod) {
      getAIResponse('debate', mod);
    }
  };

  const startClosingPhase = () => {
    setPhase('closing');
    const proTeam = participants.filter(p => p.team === 'pro');
    const conTeam = participants.filter(p => p.team === 'con');

    const order = [
      participants.find(p => p.team === 'moderator')!,
      proTeam[0],
      conTeam[0],
      proTeam[1],
      conTeam[1],
    ].filter(Boolean);

    setSpeakingOrder(order);
    setCurrentSpeakerIndex(0);

    getAIResponse('closing', order[0]);
  };

  const startAnalysisPhase = async () => {
    setPhase('analysis');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/debate-chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          topic,
          userTeam,
          language,
        }),
      });
      const data = await response.json();

      if (data.analysis) {
        setAnalysis(data.analysis);
        setPhase('summary');
      } else {
        console.error('Analysis parsing failed');
        setPhase('summary');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setPhase('summary');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAIResponse = async (currentPhase: DebatePhase, speaker: DebateParticipant) => {
    if (speaker.isUser) {
      setIsUserTurn(true);
      return;
    }

    setIsProcessing(true);
    setCurrentMessage('');

    try {
      const response = await fetch('/api/debate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          topic,
          currentSpeakerId: speaker.id,
          phase: currentPhase,
          userTeam,
          language,
        }),
      });
      const data = await response.json();

      if (data.message) {
        const newMessage: DebateMessage = {
          role: 'assistant',
          content: data.message,
          speakerId: speaker.id,
          speakerName: speaker.name,
          team: speaker.team,
          phase: currentPhase,
        };

        setMessages(prev => [...prev, newMessage]);
        setCurrentMessage(data.message);

        // Play TTS
        await playTTS(data.message, speaker.voice);

        // Move to next speaker
        proceedToNextSpeaker(currentPhase);
      }
    } catch (error) {
      console.error('AI response error:', error);
      proceedToNextSpeaker(currentPhase);
    } finally {
      setIsProcessing(false);
    }
  };

  const proceedToNextSpeaker = (currentPhase: DebatePhase) => {
    const nextIndex = currentSpeakerIndex + 1;

    if (currentPhase === 'opening') {
      if (nextIndex < speakingOrder.length) {
        setCurrentSpeakerIndex(nextIndex);
        const nextSpeaker = speakingOrder[nextIndex];
        if (nextSpeaker) {
          setTimeout(() => getAIResponse('opening', nextSpeaker), 500);
        }
      } else {
        // Opening done, start debate
        setTimeout(() => startDebatePhase(), 1000);
      }
    } else if (currentPhase === 'debate') {
      setTurnCount(prev => prev + 1);

      if (turnCount + 1 >= speakingOrder.length) {
        // Debate done, start closing
        setTimeout(() => startClosingPhase(), 1000);
      } else {
        setCurrentSpeakerIndex(nextIndex);
        const nextSpeaker = speakingOrder[nextIndex];
        if (nextSpeaker) {
          setTimeout(() => getAIResponse('debate', nextSpeaker), 500);
        }
      }
    } else if (currentPhase === 'closing') {
      if (nextIndex < speakingOrder.length) {
        setCurrentSpeakerIndex(nextIndex);
        const nextSpeaker = speakingOrder[nextIndex];
        if (nextSpeaker) {
          setTimeout(() => getAIResponse('closing', nextSpeaker), 500);
        }
      } else {
        // Closing done, start analysis
        setTimeout(() => startAnalysisPhase(), 1000);
      }
    }
  };

  const playTTS = async (text: string, voice: string) => {
    if (!voice) return;

    setIsPlaying(true);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setIsRecording(true);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await processUserAudio(audioBlob);
      };

      mediaRecorder.start(1000);
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processUserAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setIsUserTurn(false);

    try {
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', file);

      const sttResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      const sttData = await sttResponse.json();

      if (sttData.text && sttData.text.trim()) {
        const user = participants.find(p => p.isUser);
        if (user) {
          const newMessage: DebateMessage = {
            role: 'user',
            content: sttData.text,
            speakerId: 'user',
            speakerName: user.name,
            team: user.team,
            phase,
          };
          setMessages(prev => [...prev, newMessage]);
          setCurrentMessage(sttData.text);
          setUserTurnCount(prev => prev + 1);
        }

        // Proceed to next speaker
        proceedToNextSpeaker(phase);
      } else {
        // No speech detected, let user try again
        setIsUserTurn(true);
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      setIsUserTurn(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryText = (category: DebateCategory) => {
    const categoryMap: Record<string, string> = {
      // New categories
      daily: language === 'ko' ? '일상' : 'Daily Life',
      school: language === 'ko' ? '학교' : 'School',
      technology: language === 'ko' ? '기술' : 'Technology',
      society: language === 'ko' ? '사회' : 'Society',
      environment: language === 'ko' ? '환경' : 'Environment',
      culture: language === 'ko' ? '문화' : 'Culture',
      sports: language === 'ko' ? '스포츠' : 'Sports',
      ethics: language === 'ko' ? '윤리' : 'Ethics',
      // Legacy categories
      social: t.categorySocial || (language === 'ko' ? '사회' : 'Social'),
      politics: t.categoryPolitics || (language === 'ko' ? '정치' : 'Politics'),
      international: t.categoryInternational || (language === 'ko' ? '국제' : 'International'),
    };
    return categoryMap[category] || category;
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'topic': return t.topicReveal;
      case 'team': return t.teamAssignment;
      case 'opening': return t.openingStatements;
      case 'debate': return `${t.mainDebate} - ${t.turnCount.replace('{current}', String(turnCount + 1)).replace('{total}', String(speakingOrder.length))}`;
      case 'closing': return t.closingArguments;
      case 'analysis': return t.debateAnalysis;
      case 'summary': return t.debateSummary;
      default: return '';
    }
  };

  const getCurrentSpeaker = (): DebateParticipant | null => {
    if (speakingOrder.length === 0) return null;
    return speakingOrder[currentSpeakerIndex] || null;
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      {/* Header */}
      <header className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base">{t.debateMode}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{getPhaseText()}</p>
          </div>

          <div className="w-8" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">

        {/* ========== TOPIC REVEAL PHASE ========== */}
        {phase === 'topic' && topic && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
            <div className="animate-bounce-soft mb-6">
              <span className="px-4 py-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium">
                {getCategoryText(topic.category)}
              </span>
            </div>

            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 sm:p-8 shadow-lg dark:shadow-none dark:border dark:border-neutral-800 max-w-lg mx-auto border border-neutral-100">
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
                {language === 'ko' ? topic.title.ko : topic.title.en}
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base">
                {language === 'ko' ? topic.description.ko : topic.description.en}
              </p>
            </div>

            <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-6">{t.revealingTopic}</p>
          </div>
        )}

        {/* ========== TEAM ASSIGNMENT PHASE ========== */}
        {phase === 'team' && participants.length > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-8 text-center">{t.teamAssignment}</h2>

            <div className="flex items-center justify-center gap-4 sm:gap-8 w-full max-w-3xl">
              {/* Pro Team */}
              <div className={`flex-1 p-4 sm:p-6 rounded-2xl ${userTeam === 'pro' ? 'bg-green-50 dark:bg-green-500/10 border-2 border-green-400 dark:border-green-500/40' : 'bg-neutral-50 dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700'}`}>
                <h3 className="text-center font-semibold text-green-600 mb-4">{t.proTeam}</h3>
                <div className="space-y-3">
                  {participants.filter(p => p.team === 'pro').map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                        <span className="text-white font-bold">{p.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{p.name}</p>
                        {p.isUser && <span className="text-xs text-green-600">{t.yourTeam}</span>}
                        {!p.isUser && p.team === userTeam && <span className="text-xs text-neutral-500">{t.teamPartner}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS */}
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-neutral-300">{t.vsText}</span>
              </div>

              {/* Con Team */}
              <div className={`flex-1 p-4 sm:p-6 rounded-2xl ${userTeam === 'con' ? 'bg-red-50 dark:bg-red-500/10 border-2 border-red-400 dark:border-red-500/40' : 'bg-neutral-50 dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700'}`}>
                <h3 className="text-center font-semibold text-red-600 mb-4">{t.conTeam}</h3>
                <div className="space-y-3">
                  {participants.filter(p => p.team === 'con').map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                        <span className="text-white font-bold">{p.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{p.name}</p>
                        {p.isUser && <span className="text-xs text-red-600">{t.yourTeam}</span>}
                        {!p.isUser && p.team === userTeam && <span className="text-xs text-neutral-500">{t.teamPartner}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Moderator */}
            <div className="mt-8 text-center">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Moderator</p>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${moderator.gradient} flex items-center justify-center`}>
                  <span className="text-white font-bold text-sm">{moderator.name[0]}</span>
                </div>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">{moderator.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========== DEBATE PHASES (opening, debate, closing) ========== */}
        {(phase === 'opening' || phase === 'debate' || phase === 'closing') && (
          <>
            {/* Team Display */}
            <div className="px-4 py-3 bg-white dark:bg-dark-surface border-b border-neutral-100 dark:border-neutral-800">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                {/* Pro Team Avatars */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 font-medium mr-2">{t.proTeam}</span>
                  {participants.filter(p => p.team === 'pro').map((p) => (
                    <div
                      key={p.id}
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center ${
                        getCurrentSpeaker()?.id === p.id ? 'ring-2 ring-green-500 ring-offset-2' : ''
                      }`}
                    >
                      <span className="text-white text-xs font-bold">{p.name[0]}</span>
                    </div>
                  ))}
                </div>

                <span className="text-neutral-300 font-bold">{t.vsText}</span>

                {/* Con Team Avatars */}
                <div className="flex items-center gap-2">
                  {participants.filter(p => p.team === 'con').map((p) => (
                    <div
                      key={p.id}
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center ${
                        getCurrentSpeaker()?.id === p.id ? 'ring-2 ring-red-500 ring-offset-2' : ''
                      }`}
                    >
                      <span className="text-white text-xs font-bold">{p.name[0]}</span>
                    </div>
                  ))}
                  <span className="text-xs text-red-600 font-medium ml-2">{t.conTeam}</span>
                </div>
              </div>
            </div>

            {/* Main Speaker Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
              {getCurrentSpeaker() && (
                <>
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br ${getCurrentSpeaker()!.gradient} flex items-center justify-center mb-4 ${isPlaying ? 'animate-pulse' : ''}`}>
                    <span className="text-white text-3xl sm:text-4xl font-bold">{getCurrentSpeaker()!.name[0]}</span>
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{getCurrentSpeaker()!.name}</h3>
                    <span className={`text-sm ${getCurrentSpeaker()!.team === 'pro' ? 'text-green-600' : getCurrentSpeaker()!.team === 'con' ? 'text-red-600' : 'text-neutral-500'}`}>
                      {getCurrentSpeaker()!.team === 'moderator' ? 'Moderator' : getCurrentSpeaker()!.team === 'pro' ? t.proTeam : t.conTeam}
                    </span>
                  </div>

                  {/* Current Message Display */}
                  {currentMessage && !isUserTurn && (
                    <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 max-w-lg mx-auto mb-6">
                      <p className="text-neutral-800 dark:text-neutral-200 text-sm sm:text-base leading-relaxed">{currentMessage}</p>
                    </div>
                  )}

                  {/* Status indicators */}
                  {isPlaying && (
                    <div className="flex items-center gap-1 h-8 mb-4">
                      {[...Array(5)].map((_, i) => (<div key={i} className="voice-bar" />))}
                    </div>
                  )}

                  {isProcessing && !isPlaying && (
                    <div className="flex gap-2 mb-4">
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* User Input Area */}
            {isUserTurn && (
              <div className="p-4 sm:p-6 bg-white dark:bg-dark-surface border-t border-neutral-200 dark:border-neutral-800">
                <div className="max-w-lg mx-auto text-center">
                  <p className="text-amber-600 font-semibold mb-4">{t.yourTurn}</p>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all ${
                      isRecording
                        ? 'bg-red-500 text-white recording-active'
                        : 'btn-primary'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {isRecording ? t.stop : t.speakNowDebate}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== ANALYSIS PHASE ========== */}
        {phase === 'analysis' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${moderator.gradient} flex items-center justify-center mb-4`}>
              <span className="text-white text-2xl font-bold">{moderator.name[0]}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-2">{t.debateAnalysis}</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">{t.preparingDebate}</p>
            <div className="flex gap-2">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
          </div>
        )}

        {/* ========== SUMMARY PHASE ========== */}
        {phase === 'summary' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">{t.debateComplete}</h2>
            </div>

            {analysis && (
              <>
                {/* User Performance */}
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 mb-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {t.yourPerformance}
                  </h3>

                  {/* Strengths */}
                  <div className="mb-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">{t.whatYouDidWell}</p>
                    <ul className="space-y-1">
                      {analysis.userPerformance.strengths.map((s, i) => (
                        <li key={i} className="text-neutral-700 dark:text-neutral-300 text-sm flex items-start gap-2">
                          <span className="text-green-500">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">{t.areasToFocus}</p>
                    <ul className="space-y-1">
                      {analysis.userPerformance.improvements.map((s, i) => (
                        <li key={i} className="text-neutral-700 dark:text-neutral-300 text-sm flex items-start gap-2">
                          <span className="text-amber-500">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Grammar Feedback */}
                {analysis.userPerformance.grammarCorrections.length > 0 && (
                  <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 mb-4">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">{t.grammarFeedback}</h3>
                    <div className="space-y-4">
                      {analysis.userPerformance.grammarCorrections.map((c, i) => (
                        <div key={i} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                          <p className="text-red-600 dark:text-red-400 text-sm pl-2 border-l-2 border-red-300 dark:border-red-500">{c.original}</p>
                          <p className="text-green-600 dark:text-green-400 text-sm font-medium mt-1">{c.corrected}</p>
                          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">{c.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Expressions */}
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-none dark:border dark:border-neutral-800 mb-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">{t.keyExpressions}</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.expressionsToLearn.map((exp, i) => (
                      <span key={i} className="px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Overall Feedback */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-2xl p-4 sm:p-6 mb-6">
                  <p className="text-neutral-800 dark:text-neutral-200 italic">&ldquo;{analysis.overallFeedback}&rdquo;</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">— {moderator.name}</p>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 sm:gap-4">
              <button onClick={() => router.push('/')} className="flex-1 btn-secondary py-3 sm:py-4">
                {t.backToHome}
              </button>
              <button
                onClick={() => {
                  setPhase('topic');
                  setMessages([]);
                  setTurnCount(0);
                  setUserTurnCount(0);
                  setAnalysis(null);
                  setTopic(null);
                  initializeDebate();
                }}
                className="flex-1 btn-primary py-3 sm:py-4"
              >
                {t.tryAnotherDebate}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DebatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="flex gap-2">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    }>
      <DebateContent />
    </Suspense>
  );
}
