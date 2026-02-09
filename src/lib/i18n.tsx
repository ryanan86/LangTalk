'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ko' | 'en';

interface Translations {
  // Common
  appName: string;
  signIn: string;
  signOut: string;
  loading: string;
  continueWithGoogle: string;
  continueWithKakao: string;

  // Home page
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  testMicrophone: string;
  clickToTest: string;
  recording: string;
  speakNow: string;
  stop: string;
  processing: string;
  weHeard: string;
  error: string;
  testAgain: string;
  micTestHint: string;
  chooseTutor: string;
  previewVoice: string;
  playing: string;
  startConversation: string;
  selectTutorPrompt: string;
  howItWorks: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  footer: string;

  // Beta signup
  loginRequired: string;
  betaSignupPrompt: string;
  betaSignupButton: string;
  signingUp: string;
  betaPending: string;
  betaExpired: string;
  betaInactive: string;

  // Talk page
  readyToStart: string;
  readyDescription: string;
  sessionFlow: string;
  flowStep1: string;
  flowStep2: string;
  flowStep3: string;
  flowStep4: string;
  flowStep5: string;
  startFreeTalk: string;
  speakFreely: string;
  keepGoing30: string;
  greatKeepGoing: string;
  moreYouShare: string;
  doneSpeaking: string;
  speaking: string;
  thinking: string;
  recordingVoice: string;
  tapToSpeak: string;
  reply: string;
  done: string;
  listening: string;
  analyzing: string;
  analyzingDesc: string;
  correction: string;
  of: string;
  whatYouSaid: string;
  whatYouMeant: string;
  correctWay: string;
  why: string;
  nextCorrection: string;
  startShadowing: string;
  shadowing: string;
  listenAndRepeat: string;
  tapToPlay: string;
  practiceAloud: string;
  nextSentence: string;
  viewSummary: string;
  sessionComplete: string;
  whatYouDidWell: string;
  areasToFocus: string;
  backToHome: string;
  practiceAgain: string;
  exitSessionTitle: string;
  exitSessionMessage: string;
  exitSessionConfirm: string;
  exitSessionCancel: string;

  // Phases
  phaseReady: string;
  phaseFreeTalk: string;
  phaseConversation: string;
  phaseAnalyzing: string;
  phaseReview: string;
  phaseShadowing: string;
  phaseComplete: string;

  // Persona descriptions
  emmaDesc: string;
  emmaStyle: string;
  jamesDesc: string;
  jamesStyle: string;
  charlotteDesc: string;
  charlotteStyle: string;
  oliverDesc: string;
  oliverStyle: string;
  alinaDesc: string;
  alinaStyle: string;
  henlyDesc: string;
  henlyStyle: string;

  // Debate Mode
  debateMode: string;
  debateLocked: string;
  sessionsToUnlock: string;
  sessionsCompleted: string;
  startDebate: string;
  debateDescription: string;

  // Debate Teams
  proTeam: string;
  conTeam: string;
  yourTeam: string;
  teamPartner: string;
  opponents: string;
  you: string;

  // Debate Phases
  topicReveal: string;
  teamAssignment: string;
  openingStatements: string;
  mainDebate: string;
  closingArguments: string;
  debateAnalysis: string;
  debateSummary: string;

  // Debate Progress
  yourTurn: string;
  listeningTo: string;
  speakNowDebate: string;
  waitingForSpeaker: string;
  moderatorSpeaking: string;

  // Debate Categories
  categorySocial: string;
  categoryCulture: string;
  categoryEnvironment: string;
  categoryPolitics: string;
  categoryInternational: string;
  categorySports: string;

  // Debate UI
  vsText: string;
  turnCount: string;
  preparingDebate: string;
  assigningTeams: string;
  revealingTopic: string;
  debateComplete: string;
  yourPerformance: string;
  grammarFeedback: string;
  keyExpressions: string;
  debateSummaryTitle: string;
  proArguments: string;
  conArguments: string;
  tryAnotherDebate: string;
  nextSpeaker: string;
  skipIntro: string;

  // Birth Year Selector
  selectDecade: string;
  selectYear: string;
  birthYear: string;

  // Gamification
  xpEarned: string;
  levelUp: string;
  levelUpMessage: string;
  achievementUnlocked: string;
  dailyChallenge: string;
  dailyChallengeComplete: string;
  streak: string;
  streakDays: string;
  xpLabel: string;
  levelLabel: string;
  achievements: string;
  viewAll: string;
  locked: string;
  progress: string;

  // Onboarding
  welcomeTitle: string;
  welcomeSubtitle: string;
  getStarted: string;
  selectProfile: string;
  selectInterests: string;
  testYourMic: string;
  meetTutors: string;
  readyToGo: string;
  next: string;
  skip: string;
  letsStart: string;
}

const translations: Record<Language, Translations> = {
  ko: {
    // Common
    appName: 'TapTalk',
    signIn: '로그인',
    signOut: '로그아웃',
    loading: '로딩 중...',
    continueWithGoogle: 'Google로 계속하기',
    continueWithKakao: '카카오로 계속하기',

    // Home page
    heroTitle: 'AI 튜터와 함께하는',
    heroSubtitle: '영어 회화 연습',
    heroDescription: '30초 자유 발화 후 자연스러운 대화를 나눠보세요. 세션 후 상세한 피드백을 받을 수 있습니다.',
    testMicrophone: '마이크 테스트',
    clickToTest: '클릭하여 테스트',
    recording: '녹음 중...',
    speakNow: '지금 말해보세요!',
    stop: '중지',
    processing: '처리 중...',
    weHeard: '인식된 내용:',
    error: '오류:',
    testAgain: '다시 테스트',
    micTestHint: '마이크가 작동하는지 확인해보세요',
    chooseTutor: '튜터 선택',
    previewVoice: '목소리 미리듣기',
    playing: '재생 중...',
    startConversation: '대화 시작하기',
    selectTutorPrompt: '튜터를 선택해주세요',
    howItWorks: '이용 방법',
    step1Title: '자유롭게 말하기',
    step1Desc: '30초 동안 자유롭게 이야기해보세요. 부담 없이 자연스럽게 말하면 됩니다.',
    step2Title: '자연스러운 대화',
    step2Desc: 'AI 튜터가 당신의 주제에 맞춰 대화를 이어갑니다.',
    step3Title: '상세한 피드백',
    step3Desc: '문법 교정과 더 나은 표현 방법을 제안받으세요.',
    footer: 'TapTalk - AI 영어 회화 연습',

    // Beta signup
    loginRequired: '로그인 후 베타 서비스를 이용할 수 있습니다.',
    betaSignupPrompt: '베타 서비스 신청 후 승인되면 이용 가능합니다.',
    betaSignupButton: '베타 서비스 신청하기',
    signingUp: '신청 중...',
    betaPending: '베타 신청이 검토 중입니다. 승인 후 이용 가능합니다.',
    betaExpired: '이용 기간이 만료되었습니다. 관리자에게 문의해주세요.',
    betaInactive: '계정이 비활성화되었습니다. 관리자에게 문의해주세요.',

    // Talk page
    readyToStart: '님과 대화할 준비가 되셨나요?',
    readyDescription: '30초 동안 자유롭게 말한 후, 튜터가 당신의 주제에 대해 인터뷰합니다.',
    sessionFlow: '세션 진행 순서',
    flowStep1: '30초 자유 발화',
    flowStep2: 'AI 인터뷰 대화',
    flowStep3: '교정 리뷰',
    flowStep4: '쉐도잉 연습',
    flowStep5: '세션 요약',
    startFreeTalk: '자유 발화 시작',
    speakFreely: '자유롭게 아무 주제나 이야기해보세요!',
    keepGoing30: '최소 30초 이상 말해주세요',
    greatKeepGoing: '좋아요! 더 이야기해도 됩니다!',
    moreYouShare: '더 많이 이야기할수록 더 좋은 대화가 됩니다',
    doneSpeaking: '발화 완료',
    speaking: '님이 말하는 중...',
    thinking: '생각 중...',
    recordingVoice: '녹음 중...',
    tapToSpeak: '아래 버튼을 눌러 말하세요',
    reply: '답변하기',
    done: '완료',
    listening: '듣는 중...',
    analyzing: '세션을 분석 중입니다...',
    analyzingDesc: '대화 내용을 분석하여 피드백을 준비하고 있습니다',
    correction: '교정',
    of: '/',
    whatYouSaid: '당신이 말한 것',
    whatYouMeant: '표현하고 싶었던 것',
    correctWay: '올바른 표현',
    why: '왜?',
    nextCorrection: '다음 교정',
    startShadowing: '쉐도잉 시작',
    shadowing: '쉐도잉',
    listenAndRepeat: '듣고 따라하세요:',
    tapToPlay: '재생 버튼을 누르고 따라 말해보세요',
    practiceAloud: '소리 내어 연습하세요',
    nextSentence: '다음 문장',
    viewSummary: '요약 보기',
    sessionComplete: '세션 완료!',
    whatYouDidWell: '잘한 점',
    areasToFocus: '개선할 점',
    backToHome: '홈으로',
    practiceAgain: '다시 연습하기',
    exitSessionTitle: '학습을 종료하시겠습니까?',
    exitSessionMessage: '진행 중인 학습 내용이 저장되지 않습니다.',
    exitSessionConfirm: '종료',
    exitSessionCancel: '계속 학습',

    // Phases
    phaseReady: '시작 준비',
    phaseFreeTalk: '자유 발화',
    phaseConversation: '대화',
    phaseAnalyzing: '분석 중...',
    phaseReview: '교정 리뷰',
    phaseShadowing: '쉐도잉 연습',
    phaseComplete: '세션 완료',

    // Persona descriptions
    emmaDesc: '미국인 베스트 프렌드',
    emmaStyle: '재미있고 표현력 풍부, 응원해주는 친구',
    jamesDesc: '편안한 미국인 친구',
    jamesStyle: '여유롭고 유머러스, 이야기꾼',
    charlotteDesc: '위트있는 영국인 친구',
    charlotteStyle: '매력적이고 똑똑, 재치있는 대화',
    oliverDesc: '쿨한 영국인 친구',
    oliverStyle: '드라이한 유머, 진솔함, 편안한 대화',
    alinaDesc: '밝고 활발한 친구',
    alinaStyle: '에너지 넘치고 늘 신나는 또래 친구',
    henlyDesc: '장난꾸러기 호기심쟁이',
    henlyStyle: '모험심 가득, 재미있는 또래 친구',

    // Debate Mode
    debateMode: '디베이트 모드',
    debateLocked: '잠금 해제 필요',
    sessionsToUnlock: '잠금 해제까지 {n}회 남음',
    sessionsCompleted: '{n}/5 세션 완료',
    startDebate: '디베이트 시작',
    debateDescription: 'AI 튜터들과 함께 영어 토론을 연습해보세요',

    // Debate Teams
    proTeam: '찬성팀',
    conTeam: '반대팀',
    yourTeam: '내 팀',
    teamPartner: '팀 파트너',
    opponents: '상대팀',
    you: '나',

    // Debate Phases
    topicReveal: '주제 공개',
    teamAssignment: '팀 배정',
    openingStatements: '오프닝 발언',
    mainDebate: '메인 토론',
    closingArguments: '클로징 발언',
    debateAnalysis: '피드백 분석',
    debateSummary: '요약',

    // Debate Progress
    yourTurn: '내 차례입니다',
    listeningTo: '{name}의 발언 중...',
    speakNowDebate: '지금 말하세요',
    waitingForSpeaker: '발언자 대기 중...',
    moderatorSpeaking: '사회자 발언 중...',

    // Debate Categories
    categorySocial: '사회',
    categoryCulture: '문화',
    categoryEnvironment: '환경',
    categoryPolitics: '정치',
    categoryInternational: '국제',
    categorySports: '스포츠',

    // Debate UI
    vsText: 'VS',
    turnCount: '턴 {current}/{total}',
    preparingDebate: '디베이트 준비 중...',
    assigningTeams: '팀 배정 중...',
    revealingTopic: '주제 공개 중...',
    debateComplete: '디베이트 완료!',
    yourPerformance: '나의 퍼포먼스',
    grammarFeedback: '문법 피드백',
    keyExpressions: '핵심 표현',
    debateSummaryTitle: '토론 요약',
    proArguments: '찬성 측 주요 논점',
    conArguments: '반대 측 주요 논점',
    tryAnotherDebate: '다른 토론하기',
    nextSpeaker: '다음 발언자',
    skipIntro: '건너뛰기',

    // Birth Year Selector
    selectDecade: '연대를 선택하세요',
    selectYear: '연도를 선택하세요',
    birthYear: '출생연도',

    // Gamification
    xpEarned: 'XP 획득!',
    levelUp: '레벨 업!',
    levelUpMessage: '축하합니다! 레벨 {level}에 도달했습니다!',
    achievementUnlocked: '업적 달성!',
    dailyChallenge: '오늘의 챌린지',
    dailyChallengeComplete: '챌린지 완료!',
    streak: '연속 학습',
    streakDays: '{n}일 연속',
    xpLabel: '경험치',
    levelLabel: '레벨',
    achievements: '업적',
    viewAll: '전체 보기',
    locked: '잠금',
    progress: '진행률',

    // Onboarding
    welcomeTitle: 'TapTalk에 오신 것을 환영합니다!',
    welcomeSubtitle: 'AI 튜터와 함께 영어 실력을 키워보세요',
    getStarted: '시작하기',
    selectProfile: '프로필을 선택해주세요',
    selectInterests: '관심사를 선택해주세요',
    testYourMic: '마이크를 테스트해보세요',
    meetTutors: 'AI 튜터를 만나보세요',
    readyToGo: '준비 완료!',
    next: '다음',
    skip: '건너뛰기',
    letsStart: '대화 시작하기',
  },
  en: {
    // Common
    appName: 'TapTalk',
    signIn: 'Sign in',
    signOut: 'Sign out',
    loading: 'Loading...',
    continueWithGoogle: 'Continue with Google',
    continueWithKakao: 'Continue with Kakao',

    // Home page
    heroTitle: 'Practice English with',
    heroSubtitle: 'AI Tutors',
    heroDescription: 'Speak freely for 30 seconds, then have a natural conversation. Get detailed feedback after your session.',
    testMicrophone: 'Test Your Microphone',
    clickToTest: 'Click to Test',
    recording: 'Recording...',
    speakNow: 'Speak now!',
    stop: 'Stop',
    processing: 'Processing...',
    weHeard: 'We heard:',
    error: 'Error:',
    testAgain: 'Test Again',
    micTestHint: 'Say something to verify your microphone works',
    chooseTutor: 'Choose Your Tutor',
    previewVoice: 'Preview Voice',
    playing: 'Playing...',
    startConversation: 'Start Conversation',
    selectTutorPrompt: 'Please select a tutor to continue',
    howItWorks: 'How It Works',
    step1Title: 'Speak Freely',
    step1Desc: 'Talk about anything for 30 seconds. No pressure, just speak naturally.',
    step2Title: 'Natural Conversation',
    step2Desc: 'Your AI tutor continues the conversation based on your topic.',
    step3Title: 'Detailed Feedback',
    step3Desc: 'Get comprehensive corrections and better ways to express yourself.',
    footer: 'TapTalk - AI English Conversation Practice',

    // Beta signup
    loginRequired: 'Please sign in to use the beta service.',
    betaSignupPrompt: 'Sign up for beta access to start using the service.',
    betaSignupButton: 'Sign Up for Beta',
    signingUp: 'Signing up...',
    betaPending: 'Your beta application is under review. Please wait for approval.',
    betaExpired: 'Your subscription has expired. Please contact support.',
    betaInactive: 'Your account is inactive. Please contact support.',

    // Talk page
    readyToStart: 'Ready to practice with ',
    readyDescription: "You'll have 30 seconds to speak freely. Then the tutor will interview you about your topic.",
    sessionFlow: 'Session Flow',
    flowStep1: '30-second free talk',
    flowStep2: 'AI interview conversation',
    flowStep3: 'Correction review with audio',
    flowStep4: 'Shadowing practice',
    flowStep5: 'Session summary',
    startFreeTalk: 'Start Free Talk',
    speakFreely: 'Speak freely about anything!',
    keepGoing30: 'Keep going for at least 30 seconds',
    greatKeepGoing: 'Great! Keep going if you want!',
    moreYouShare: 'The more you share, the better the conversation',
    doneSpeaking: 'Done Speaking',
    speaking: ' is speaking...',
    thinking: 'Thinking...',
    recordingVoice: 'Recording your voice...',
    tapToSpeak: 'Tap the button below to speak',
    reply: 'Reply',
    done: 'Done',
    listening: 'Listening...',
    analyzing: ' is reviewing your session...',
    analyzingDesc: 'Analyzing your conversation for feedback',
    correction: 'Correction',
    of: 'of',
    whatYouSaid: 'What you said',
    whatYouMeant: 'What you meant',
    correctWay: 'Correct way to say it',
    why: 'Why?',
    nextCorrection: 'Next Correction',
    startShadowing: 'Start Shadowing Practice',
    shadowing: 'Shadowing',
    listenAndRepeat: 'Listen and repeat:',
    tapToPlay: 'Tap to play, then practice saying it aloud',
    practiceAloud: 'Practice saying it aloud',
    nextSentence: 'Next Sentence',
    viewSummary: 'View Summary',
    sessionComplete: 'Session Complete!',
    whatYouDidWell: 'What you did well',
    areasToFocus: 'Areas to focus on',
    backToHome: 'Back to Home',
    practiceAgain: 'Practice Again',
    exitSessionTitle: 'End this session?',
    exitSessionMessage: 'Your learning progress will not be saved.',
    exitSessionConfirm: 'End Session',
    exitSessionCancel: 'Keep Learning',

    // Phases
    phaseReady: 'Ready to start',
    phaseFreeTalk: 'Free Talk',
    phaseConversation: 'Conversation',
    phaseAnalyzing: 'Analyzing...',
    phaseReview: 'Correction Review',
    phaseShadowing: 'Shadowing Practice',
    phaseComplete: 'Session Complete',

    // Persona descriptions
    emmaDesc: 'Your American bestie',
    emmaStyle: 'Fun, expressive, the friend who hypes you up',
    jamesDesc: 'Chill American bro',
    jamesStyle: 'Relaxed, funny, great storyteller',
    charlotteDesc: 'Witty British friend',
    charlotteStyle: 'Charming, clever, great banter',
    oliverDesc: 'Cool British guy',
    oliverStyle: 'Dry wit, genuine, easy to talk to',
    alinaDesc: 'Bright & bubbly friend',
    alinaStyle: 'Cheerful, energetic, always excited',
    henlyDesc: 'Playful & curious buddy',
    henlyStyle: 'Adventurous, funny, full of questions',

    // Debate Mode
    debateMode: 'Debate Mode',
    debateLocked: 'Unlock Required',
    sessionsToUnlock: '{n} sessions to unlock',
    sessionsCompleted: '{n}/5 sessions completed',
    startDebate: 'Start Debate',
    debateDescription: 'Practice English debates with AI tutors',

    // Debate Teams
    proTeam: 'Pro Team',
    conTeam: 'Con Team',
    yourTeam: 'Your Team',
    teamPartner: 'Team Partner',
    opponents: 'Opponents',
    you: 'You',

    // Debate Phases
    topicReveal: 'Topic Reveal',
    teamAssignment: 'Team Assignment',
    openingStatements: 'Opening Statements',
    mainDebate: 'Main Debate',
    closingArguments: 'Closing Arguments',
    debateAnalysis: 'Feedback & Analysis',
    debateSummary: 'Summary',

    // Debate Progress
    yourTurn: 'Your Turn',
    listeningTo: 'Listening to {name}...',
    speakNowDebate: 'Speak Now',
    waitingForSpeaker: 'Waiting for speaker...',
    moderatorSpeaking: 'Moderator speaking...',

    // Debate Categories
    categorySocial: 'Social',
    categoryCulture: 'Culture',
    categoryEnvironment: 'Environment',
    categoryPolitics: 'Politics',
    categoryInternational: 'International',
    categorySports: 'Sports',

    // Debate UI
    vsText: 'VS',
    turnCount: 'Turn {current}/{total}',
    preparingDebate: 'Preparing debate...',
    assigningTeams: 'Assigning teams...',
    revealingTopic: 'Revealing topic...',
    debateComplete: 'Debate Complete!',
    yourPerformance: 'Your Performance',
    grammarFeedback: 'Grammar Feedback',
    keyExpressions: 'Key Expressions',
    debateSummaryTitle: 'Debate Summary',
    proArguments: 'Pro Arguments',
    conArguments: 'Con Arguments',
    tryAnotherDebate: 'Try Another Debate',
    nextSpeaker: 'Next Speaker',
    skipIntro: 'Skip',

    // Birth Year Selector
    selectDecade: 'Select a decade',
    selectYear: 'Select a year',
    birthYear: 'Birth Year',

    // Gamification
    xpEarned: 'XP Earned!',
    levelUp: 'Level Up!',
    levelUpMessage: 'Congratulations! You reached Level {level}!',
    achievementUnlocked: 'Achievement Unlocked!',
    dailyChallenge: "Today's Challenge",
    dailyChallengeComplete: 'Challenge Complete!',
    streak: 'Streak',
    streakDays: '{n} day streak',
    xpLabel: 'Experience',
    levelLabel: 'Level',
    achievements: 'Achievements',
    viewAll: 'View All',
    locked: 'Locked',
    progress: 'Progress',

    // Onboarding
    welcomeTitle: 'Welcome to TapTalk!',
    welcomeSubtitle: 'Improve your English with AI tutors',
    getStarted: 'Get Started',
    selectProfile: 'Select your profile',
    selectInterests: 'Choose your interests',
    testYourMic: 'Test your microphone',
    meetTutors: 'Meet the AI tutors',
    readyToGo: "You're all set!",
    next: 'Next',
    skip: 'Skip',
    letsStart: "Let's Start Talking",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage?.getItem('taptalk-language') as Language;
      if (saved && (saved === 'ko' || saved === 'en')) {
        setLanguage(saved);
        document.cookie = `lang=${saved};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      } else {
        document.cookie = `lang=en;path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      }
    } catch {
      document.cookie = `lang=en;path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    try { localStorage?.setItem('taptalk-language', lang); } catch {}
    document.cookie = `lang=${lang};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center rounded-full bg-neutral-100 dark:bg-white/10 backdrop-blur-sm border border-neutral-200 dark:border-white/20 p-1">
      <button
        onClick={() => setLanguage('ko')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          language === 'ko'
            ? 'bg-white dark:bg-white text-black shadow-sm'
            : 'text-neutral-500 dark:text-white/70 hover:text-neutral-700 dark:hover:text-white'
        }`}
      >
        한국어
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          language === 'en'
            ? 'bg-white dark:bg-white text-black shadow-sm'
            : 'text-neutral-500 dark:text-white/70 hover:text-neutral-700 dark:hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
}
