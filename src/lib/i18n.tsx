'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ko' | 'en' | 'nl' | 'ru' | 'fr' | 'es' | 'zh' | 'de';

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
  contactUs: string;
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
    contactUs: '문의하기',
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
    contactUs: 'Contact Us',
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
  nl: {
    appName: 'TapTalk',
    signIn: 'Inloggen',
    signOut: 'Uitloggen',
    loading: 'Laden...',
    continueWithGoogle: 'Doorgaan met Google',
    continueWithKakao: 'Doorgaan met Kakao',
    heroTitle: 'Oefen Engels met',
    heroSubtitle: 'AI Tutors',
    heroDescription: 'Spreek 30 seconden vrij en voer dan een natuurlijk gesprek. Ontvang gedetailleerde feedback na je sessie.',
    testMicrophone: 'Test je microfoon',
    clickToTest: 'Klik om te testen',
    recording: 'Opnemen...',
    speakNow: 'Spreek nu!',
    stop: 'Stop',
    processing: 'Verwerken...',
    weHeard: 'We hoorden:',
    error: 'Fout:',
    testAgain: 'Opnieuw testen',
    micTestHint: 'Zeg iets om te controleren of je microfoon werkt',
    chooseTutor: 'Kies je tutor',
    previewVoice: 'Stem beluisteren',
    playing: 'Afspelen...',
    startConversation: 'Gesprek starten',
    selectTutorPrompt: 'Selecteer een tutor om door te gaan',
    howItWorks: 'Hoe het werkt',
    step1Title: 'Spreek vrij',
    step1Desc: 'Praat 30 seconden over elk onderwerp. Geen druk, spreek gewoon natuurlijk.',
    step2Title: 'Natuurlijk gesprek',
    step2Desc: 'Je AI-tutor zet het gesprek voort op basis van jouw onderwerp.',
    step3Title: 'Gedetailleerde feedback',
    step3Desc: 'Ontvang uitgebreide correcties en betere manieren om jezelf uit te drukken.',
    contactUs: 'Neem contact op',
    footer: 'TapTalk - AI Engels conversatieoefening',
    loginRequired: 'Log in om de betaservice te gebruiken.',
    betaSignupPrompt: 'Meld je aan voor betatoegang om de service te gebruiken.',
    betaSignupButton: 'Aanmelden voor beta',
    signingUp: 'Aanmelden...',
    betaPending: 'Je beta-aanvraag wordt beoordeeld. Wacht op goedkeuring.',
    betaExpired: 'Je abonnement is verlopen. Neem contact op met support.',
    betaInactive: 'Je account is inactief. Neem contact op met support.',
    readyToStart: 'Klaar om te oefenen met ',
    readyDescription: 'Je hebt 30 seconden om vrij te spreken. Daarna interviewt de tutor je over je onderwerp.',
    sessionFlow: 'Sessieverloop',
    flowStep1: '30 seconden vrij spreken',
    flowStep2: 'AI-interviewgesprek',
    flowStep3: 'Correctiebeoordeling',
    flowStep4: 'Shadowing-oefening',
    flowStep5: 'Sessiesamenvatting',
    startFreeTalk: 'Vrij spreken starten',
    speakFreely: 'Spreek vrij over elk onderwerp!',
    keepGoing30: 'Ga door voor minstens 30 seconden',
    greatKeepGoing: 'Geweldig! Ga door als je wilt!',
    moreYouShare: 'Hoe meer je deelt, hoe beter het gesprek',
    doneSpeaking: 'Klaar met spreken',
    speaking: ' is aan het spreken...',
    thinking: 'Nadenken...',
    recordingVoice: 'Je stem opnemen...',
    tapToSpeak: 'Tik op de knop hieronder om te spreken',
    reply: 'Antwoorden',
    done: 'Klaar',
    listening: 'Luisteren...',
    analyzing: ' bekijkt je sessie...',
    analyzingDesc: 'Je gesprek wordt geanalyseerd voor feedback',
    correction: 'Correctie',
    of: 'van',
    whatYouSaid: 'Wat je zei',
    whatYouMeant: 'Wat je bedoelde',
    correctWay: 'De juiste manier',
    why: 'Waarom?',
    nextCorrection: 'Volgende correctie',
    startShadowing: 'Shadowing starten',
    shadowing: 'Shadowing',
    listenAndRepeat: 'Luister en herhaal:',
    tapToPlay: 'Tik om af te spelen en oefen hardop',
    practiceAloud: 'Oefen hardop',
    nextSentence: 'Volgende zin',
    viewSummary: 'Samenvatting bekijken',
    sessionComplete: 'Sessie voltooid!',
    whatYouDidWell: 'Wat je goed deed',
    areasToFocus: 'Aandachtspunten',
    backToHome: 'Terug naar home',
    practiceAgain: 'Opnieuw oefenen',
    exitSessionTitle: 'Sessie beëindigen?',
    exitSessionMessage: 'Je voortgang wordt niet opgeslagen.',
    exitSessionConfirm: 'Beëindigen',
    exitSessionCancel: 'Doorgaan met leren',
    phaseReady: 'Klaar om te starten',
    phaseFreeTalk: 'Vrij spreken',
    phaseConversation: 'Gesprek',
    phaseAnalyzing: 'Analyseren...',
    phaseReview: 'Correctiebeoordeling',
    phaseShadowing: 'Shadowing-oefening',
    phaseComplete: 'Sessie voltooid',
    emmaDesc: 'Je Amerikaanse beste vriendin',
    emmaStyle: 'Leuk, expressief, moedigt je aan',
    jamesDesc: 'Relaxte Amerikaanse vriend',
    jamesStyle: 'Ontspannen, grappig, geweldige verteller',
    charlotteDesc: 'Gevatte Britse vriendin',
    charlotteStyle: 'Charmant, slim, leuke gesprekken',
    oliverDesc: 'Coole Britse vriend',
    oliverStyle: 'Droge humor, oprecht, makkelijk prater',
    alinaDesc: 'Vrolijke en levendige vriendin',
    alinaStyle: 'Opgewekt, energiek, altijd enthousiast',
    henlyDesc: 'Speelse en nieuwsgierige vriend',
    henlyStyle: 'Avontuurlijk, grappig, vol vragen',
    debateMode: 'Debatmodus',
    debateLocked: 'Ontgrendeling vereist',
    sessionsToUnlock: 'Nog {n} sessies om te ontgrendelen',
    sessionsCompleted: '{n}/5 sessies voltooid',
    startDebate: 'Debat starten',
    debateDescription: 'Oefen Engelse debatten met AI-tutors',
    proTeam: 'Voorstanders',
    conTeam: 'Tegenstanders',
    yourTeam: 'Jouw team',
    teamPartner: 'Teampartner',
    opponents: 'Tegenstanders',
    you: 'Jij',
    topicReveal: 'Onderwerp onthullen',
    teamAssignment: 'Teamindeling',
    openingStatements: 'Openingsverklaringen',
    mainDebate: 'Hoofddebat',
    closingArguments: 'Slotargumenten',
    debateAnalysis: 'Feedback & analyse',
    debateSummary: 'Samenvatting',
    yourTurn: 'Jouw beurt',
    listeningTo: 'Luisteren naar {name}...',
    speakNowDebate: 'Spreek nu',
    waitingForSpeaker: 'Wachten op spreker...',
    moderatorSpeaking: 'Moderator spreekt...',
    categorySocial: 'Sociaal',
    categoryCulture: 'Cultuur',
    categoryEnvironment: 'Milieu',
    categoryPolitics: 'Politiek',
    categoryInternational: 'Internationaal',
    categorySports: 'Sport',
    vsText: 'VS',
    turnCount: 'Beurt {current}/{total}',
    preparingDebate: 'Debat voorbereiden...',
    assigningTeams: 'Teams indelen...',
    revealingTopic: 'Onderwerp onthullen...',
    debateComplete: 'Debat voltooid!',
    yourPerformance: 'Jouw prestatie',
    grammarFeedback: 'Grammaticafeedback',
    keyExpressions: 'Belangrijke uitdrukkingen',
    debateSummaryTitle: 'Debatsamenvatting',
    proArguments: 'Argumenten voor',
    conArguments: 'Argumenten tegen',
    tryAnotherDebate: 'Nog een debat',
    nextSpeaker: 'Volgende spreker',
    skipIntro: 'Overslaan',
    selectDecade: 'Selecteer een decennium',
    selectYear: 'Selecteer een jaar',
    birthYear: 'Geboortejaar',
    xpEarned: 'XP verdiend!',
    levelUp: 'Level omhoog!',
    levelUpMessage: 'Gefeliciteerd! Je hebt level {level} bereikt!',
    achievementUnlocked: 'Prestatie ontgrendeld!',
    dailyChallenge: 'Dagelijkse uitdaging',
    dailyChallengeComplete: 'Uitdaging voltooid!',
    streak: 'Reeks',
    streakDays: '{n} dagen reeks',
    xpLabel: 'Ervaring',
    levelLabel: 'Level',
    achievements: 'Prestaties',
    viewAll: 'Alles bekijken',
    locked: 'Vergrendeld',
    progress: 'Voortgang',
    welcomeTitle: 'Welkom bij TapTalk!',
    welcomeSubtitle: 'Verbeter je Engels met AI-tutors',
    getStarted: 'Aan de slag',
    selectProfile: 'Selecteer je profiel',
    selectInterests: 'Kies je interesses',
    testYourMic: 'Test je microfoon',
    meetTutors: 'Ontmoet de AI-tutors',
    readyToGo: 'Je bent klaar!',
    next: 'Volgende',
    skip: 'Overslaan',
    letsStart: 'Laten we beginnen',
  },
  ru: {
    appName: 'TapTalk',
    signIn: 'Войти',
    signOut: 'Выйти',
    loading: 'Загрузка...',
    continueWithGoogle: 'Продолжить с Google',
    continueWithKakao: 'Продолжить с Kakao',
    heroTitle: 'Практикуй английский с',
    heroSubtitle: 'AI-репетиторами',
    heroDescription: 'Говори свободно 30 секунд, затем веди естественный разговор. Получи подробную обратную связь после сессии.',
    testMicrophone: 'Проверить микрофон',
    clickToTest: 'Нажмите для проверки',
    recording: 'Запись...',
    speakNow: 'Говорите!',
    stop: 'Стоп',
    processing: 'Обработка...',
    weHeard: 'Мы услышали:',
    error: 'Ошибка:',
    testAgain: 'Повторить тест',
    micTestHint: 'Скажите что-нибудь, чтобы проверить микрофон',
    chooseTutor: 'Выберите репетитора',
    previewVoice: 'Прослушать голос',
    playing: 'Воспроизведение...',
    startConversation: 'Начать разговор',
    selectTutorPrompt: 'Выберите репетитора для продолжения',
    howItWorks: 'Как это работает',
    step1Title: 'Говорите свободно',
    step1Desc: 'Говорите 30 секунд на любую тему. Без давления, просто говорите естественно.',
    step2Title: 'Естественный разговор',
    step2Desc: 'AI-репетитор продолжит разговор на вашу тему.',
    step3Title: 'Подробная обратная связь',
    step3Desc: 'Получите исправления и лучшие способы выразить свои мысли.',
    contactUs: 'Связаться с нами',
    footer: 'TapTalk - Практика английского с AI',
    loginRequired: 'Войдите, чтобы использовать бета-сервис.',
    betaSignupPrompt: 'Зарегистрируйтесь для доступа к бета-версии.',
    betaSignupButton: 'Зарегистрироваться',
    signingUp: 'Регистрация...',
    betaPending: 'Ваша заявка на рассмотрении. Ожидайте одобрения.',
    betaExpired: 'Срок подписки истёк. Свяжитесь с поддержкой.',
    betaInactive: 'Ваш аккаунт неактивен. Свяжитесь с поддержкой.',
    readyToStart: 'Готовы практиковаться с ',
    readyDescription: 'У вас будет 30 секунд свободной речи. Затем репетитор проведёт интервью по вашей теме.',
    sessionFlow: 'Ход сессии',
    flowStep1: '30 секунд свободной речи',
    flowStep2: 'AI-интервью',
    flowStep3: 'Разбор ошибок',
    flowStep4: 'Практика шэдоуинга',
    flowStep5: 'Итоги сессии',
    startFreeTalk: 'Начать свободную речь',
    speakFreely: 'Говорите свободно на любую тему!',
    keepGoing30: 'Продолжайте минимум 30 секунд',
    greatKeepGoing: 'Отлично! Продолжайте!',
    moreYouShare: 'Чем больше вы говорите, тем лучше разговор',
    doneSpeaking: 'Закончить речь',
    speaking: ' говорит...',
    thinking: 'Думаю...',
    recordingVoice: 'Запись голоса...',
    tapToSpeak: 'Нажмите кнопку ниже, чтобы говорить',
    reply: 'Ответить',
    done: 'Готово',
    listening: 'Слушаю...',
    analyzing: ' анализирует вашу сессию...',
    analyzingDesc: 'Анализируем ваш разговор для обратной связи',
    correction: 'Исправление',
    of: 'из',
    whatYouSaid: 'Что вы сказали',
    whatYouMeant: 'Что вы хотели сказать',
    correctWay: 'Правильный вариант',
    why: 'Почему?',
    nextCorrection: 'Следующее исправление',
    startShadowing: 'Начать шэдоуинг',
    shadowing: 'Шэдоуинг',
    listenAndRepeat: 'Слушайте и повторяйте:',
    tapToPlay: 'Нажмите для воспроизведения и повторите вслух',
    practiceAloud: 'Повторите вслух',
    nextSentence: 'Следующее предложение',
    viewSummary: 'Посмотреть итоги',
    sessionComplete: 'Сессия завершена!',
    whatYouDidWell: 'Что получилось хорошо',
    areasToFocus: 'Над чем поработать',
    backToHome: 'На главную',
    practiceAgain: 'Практиковаться снова',
    exitSessionTitle: 'Завершить сессию?',
    exitSessionMessage: 'Ваш прогресс не будет сохранён.',
    exitSessionConfirm: 'Завершить',
    exitSessionCancel: 'Продолжить обучение',
    phaseReady: 'Готов к началу',
    phaseFreeTalk: 'Свободная речь',
    phaseConversation: 'Разговор',
    phaseAnalyzing: 'Анализ...',
    phaseReview: 'Разбор ошибок',
    phaseShadowing: 'Шэдоуинг',
    phaseComplete: 'Сессия завершена',
    emmaDesc: 'Твоя американская подруга',
    emmaStyle: 'Весёлая, выразительная, поддерживает',
    jamesDesc: 'Спокойный американский друг',
    jamesStyle: 'Расслабленный, смешной, отличный рассказчик',
    charlotteDesc: 'Остроумная британская подруга',
    charlotteStyle: 'Обаятельная, умная, отличная собеседница',
    oliverDesc: 'Крутой британский парень',
    oliverStyle: 'Сухой юмор, искренний, легко общаться',
    alinaDesc: 'Яркая и весёлая подруга',
    alinaStyle: 'Жизнерадостная, энергичная, всегда в восторге',
    henlyDesc: 'Игривый и любопытный друг',
    henlyStyle: 'Авантюрный, смешной, полон вопросов',
    debateMode: 'Режим дебатов',
    debateLocked: 'Требуется разблокировка',
    sessionsToUnlock: 'Ещё {n} сессий для разблокировки',
    sessionsCompleted: '{n}/5 сессий завершено',
    startDebate: 'Начать дебаты',
    debateDescription: 'Практикуйте дебаты на английском с AI-репетиторами',
    proTeam: 'За',
    conTeam: 'Против',
    yourTeam: 'Ваша команда',
    teamPartner: 'Партнёр по команде',
    opponents: 'Оппоненты',
    you: 'Вы',
    topicReveal: 'Тема',
    teamAssignment: 'Распределение команд',
    openingStatements: 'Вступительные речи',
    mainDebate: 'Основные дебаты',
    closingArguments: 'Заключительные аргументы',
    debateAnalysis: 'Анализ и обратная связь',
    debateSummary: 'Итоги',
    yourTurn: 'Ваша очередь',
    listeningTo: 'Слушаем {name}...',
    speakNowDebate: 'Говорите',
    waitingForSpeaker: 'Ожидание спикера...',
    moderatorSpeaking: 'Модератор говорит...',
    categorySocial: 'Общество',
    categoryCulture: 'Культура',
    categoryEnvironment: 'Экология',
    categoryPolitics: 'Политика',
    categoryInternational: 'Международные',
    categorySports: 'Спорт',
    vsText: 'VS',
    turnCount: 'Ход {current}/{total}',
    preparingDebate: 'Подготовка дебатов...',
    assigningTeams: 'Распределение команд...',
    revealingTopic: 'Объявление темы...',
    debateComplete: 'Дебаты завершены!',
    yourPerformance: 'Ваши результаты',
    grammarFeedback: 'Грамматика',
    keyExpressions: 'Ключевые выражения',
    debateSummaryTitle: 'Итоги дебатов',
    proArguments: 'Аргументы за',
    conArguments: 'Аргументы против',
    tryAnotherDebate: 'Другие дебаты',
    nextSpeaker: 'Следующий спикер',
    skipIntro: 'Пропустить',
    selectDecade: 'Выберите десятилетие',
    selectYear: 'Выберите год',
    birthYear: 'Год рождения',
    xpEarned: 'XP получен!',
    levelUp: 'Новый уровень!',
    levelUpMessage: 'Поздравляем! Вы достигли уровня {level}!',
    achievementUnlocked: 'Достижение разблокировано!',
    dailyChallenge: 'Ежедневное задание',
    dailyChallengeComplete: 'Задание выполнено!',
    streak: 'Серия',
    streakDays: '{n} дней подряд',
    xpLabel: 'Опыт',
    levelLabel: 'Уровень',
    achievements: 'Достижения',
    viewAll: 'Показать все',
    locked: 'Заблокировано',
    progress: 'Прогресс',
    welcomeTitle: 'Добро пожаловать в TapTalk!',
    welcomeSubtitle: 'Улучшайте английский с AI-репетиторами',
    getStarted: 'Начать',
    selectProfile: 'Выберите профиль',
    selectInterests: 'Выберите интересы',
    testYourMic: 'Проверьте микрофон',
    meetTutors: 'Познакомьтесь с AI-репетиторами',
    readyToGo: 'Всё готово!',
    next: 'Далее',
    skip: 'Пропустить',
    letsStart: 'Начнём разговор',
  },
  fr: {
    appName: 'TapTalk',
    signIn: 'Se connecter',
    signOut: 'Se déconnecter',
    loading: 'Chargement...',
    continueWithGoogle: 'Continuer avec Google',
    continueWithKakao: 'Continuer avec Kakao',
    heroTitle: "Pratiquez l'anglais avec",
    heroSubtitle: 'des tuteurs IA',
    heroDescription: 'Parlez librement pendant 30 secondes, puis engagez une conversation naturelle. Recevez un retour détaillé après votre session.',
    testMicrophone: 'Tester le microphone',
    clickToTest: 'Cliquez pour tester',
    recording: 'Enregistrement...',
    speakNow: 'Parlez maintenant !',
    stop: 'Arrêter',
    processing: 'Traitement...',
    weHeard: 'Nous avons entendu :',
    error: 'Erreur :',
    testAgain: 'Tester à nouveau',
    micTestHint: 'Dites quelque chose pour vérifier votre microphone',
    chooseTutor: 'Choisissez votre tuteur',
    previewVoice: 'Aperçu de la voix',
    playing: 'Lecture...',
    startConversation: 'Commencer la conversation',
    selectTutorPrompt: 'Veuillez sélectionner un tuteur',
    howItWorks: 'Comment ça marche',
    step1Title: 'Parlez librement',
    step1Desc: 'Parlez de ce que vous voulez pendant 30 secondes. Sans pression, parlez naturellement.',
    step2Title: 'Conversation naturelle',
    step2Desc: 'Votre tuteur IA poursuit la conversation sur votre sujet.',
    step3Title: 'Retour détaillé',
    step3Desc: "Recevez des corrections complètes et de meilleures façons de vous exprimer.",
    contactUs: 'Nous contacter',
    footer: "TapTalk - Pratique de l'anglais avec IA",
    loginRequired: 'Connectez-vous pour utiliser le service bêta.',
    betaSignupPrompt: "Inscrivez-vous pour accéder à la version bêta.",
    betaSignupButton: "S'inscrire à la bêta",
    signingUp: 'Inscription...',
    betaPending: "Votre demande est en cours d'examen. Veuillez patienter.",
    betaExpired: 'Votre abonnement a expiré. Contactez le support.',
    betaInactive: 'Votre compte est inactif. Contactez le support.',
    readyToStart: 'Prêt à pratiquer avec ',
    readyDescription: 'Vous aurez 30 secondes de parole libre. Ensuite, le tuteur vous interviewera sur votre sujet.',
    sessionFlow: 'Déroulement de la session',
    flowStep1: '30 secondes de parole libre',
    flowStep2: 'Interview IA',
    flowStep3: 'Revue des corrections',
    flowStep4: 'Pratique de shadowing',
    flowStep5: 'Résumé de session',
    startFreeTalk: 'Commencer la parole libre',
    speakFreely: 'Parlez librement de ce que vous voulez !',
    keepGoing30: 'Continuez pendant au moins 30 secondes',
    greatKeepGoing: 'Super ! Continuez si vous le souhaitez !',
    moreYouShare: 'Plus vous partagez, meilleure sera la conversation',
    doneSpeaking: 'Terminé',
    speaking: ' parle...',
    thinking: 'Réflexion...',
    recordingVoice: 'Enregistrement de votre voix...',
    tapToSpeak: 'Appuyez sur le bouton ci-dessous pour parler',
    reply: 'Répondre',
    done: 'Terminé',
    listening: 'Écoute...',
    analyzing: ' analyse votre session...',
    analyzingDesc: 'Analyse de votre conversation pour le retour',
    correction: 'Correction',
    of: 'sur',
    whatYouSaid: 'Ce que vous avez dit',
    whatYouMeant: 'Ce que vous vouliez dire',
    correctWay: 'La bonne façon de le dire',
    why: 'Pourquoi ?',
    nextCorrection: 'Correction suivante',
    startShadowing: 'Commencer le shadowing',
    shadowing: 'Shadowing',
    listenAndRepeat: 'Écoutez et répétez :',
    tapToPlay: 'Appuyez pour écouter, puis répétez à voix haute',
    practiceAloud: 'Pratiquez à voix haute',
    nextSentence: 'Phrase suivante',
    viewSummary: 'Voir le résumé',
    sessionComplete: 'Session terminée !',
    whatYouDidWell: 'Ce que vous avez bien fait',
    areasToFocus: 'Points à améliorer',
    backToHome: "Retour à l'accueil",
    practiceAgain: 'Pratiquer à nouveau',
    exitSessionTitle: 'Quitter la session ?',
    exitSessionMessage: 'Votre progression ne sera pas sauvegardée.',
    exitSessionConfirm: 'Quitter',
    exitSessionCancel: "Continuer l'apprentissage",
    phaseReady: 'Prêt à commencer',
    phaseFreeTalk: 'Parole libre',
    phaseConversation: 'Conversation',
    phaseAnalyzing: 'Analyse...',
    phaseReview: 'Revue des corrections',
    phaseShadowing: 'Pratique de shadowing',
    phaseComplete: 'Session terminée',
    emmaDesc: 'Votre meilleure amie américaine',
    emmaStyle: 'Amusante, expressive, vous encourage',
    jamesDesc: 'Ami américain décontracté',
    jamesStyle: 'Détendu, drôle, excellent conteur',
    charlotteDesc: 'Amie britannique spirituelle',
    charlotteStyle: 'Charmante, intelligente, conversations agréables',
    oliverDesc: 'Ami britannique cool',
    oliverStyle: "Humour pince-sans-rire, sincère, facile à aborder",
    alinaDesc: 'Amie joyeuse et pétillante',
    alinaStyle: 'Gaie, énergique, toujours enthousiaste',
    henlyDesc: 'Ami joueur et curieux',
    henlyStyle: "Aventurier, drôle, plein de questions",
    debateMode: 'Mode débat',
    debateLocked: 'Déverrouillage requis',
    sessionsToUnlock: 'Encore {n} sessions pour débloquer',
    sessionsCompleted: '{n}/5 sessions terminées',
    startDebate: 'Commencer le débat',
    debateDescription: 'Pratiquez les débats en anglais avec des tuteurs IA',
    proTeam: 'Pour',
    conTeam: 'Contre',
    yourTeam: 'Votre équipe',
    teamPartner: 'Partenaire',
    opponents: 'Adversaires',
    you: 'Vous',
    topicReveal: 'Révélation du sujet',
    teamAssignment: 'Attribution des équipes',
    openingStatements: 'Déclarations préliminaires',
    mainDebate: 'Débat principal',
    closingArguments: 'Arguments de clôture',
    debateAnalysis: 'Analyse et retour',
    debateSummary: 'Résumé',
    yourTurn: 'Votre tour',
    listeningTo: 'Écoute de {name}...',
    speakNowDebate: 'Parlez maintenant',
    waitingForSpeaker: 'En attente du locuteur...',
    moderatorSpeaking: 'Le modérateur parle...',
    categorySocial: 'Société',
    categoryCulture: 'Culture',
    categoryEnvironment: 'Environnement',
    categoryPolitics: 'Politique',
    categoryInternational: 'International',
    categorySports: 'Sports',
    vsText: 'VS',
    turnCount: 'Tour {current}/{total}',
    preparingDebate: 'Préparation du débat...',
    assigningTeams: 'Attribution des équipes...',
    revealingTopic: 'Révélation du sujet...',
    debateComplete: 'Débat terminé !',
    yourPerformance: 'Votre performance',
    grammarFeedback: 'Retour grammatical',
    keyExpressions: 'Expressions clés',
    debateSummaryTitle: 'Résumé du débat',
    proArguments: 'Arguments pour',
    conArguments: 'Arguments contre',
    tryAnotherDebate: 'Essayer un autre débat',
    nextSpeaker: 'Prochain orateur',
    skipIntro: 'Passer',
    selectDecade: 'Sélectionnez une décennie',
    selectYear: 'Sélectionnez une année',
    birthYear: 'Année de naissance',
    xpEarned: 'XP gagné !',
    levelUp: 'Niveau supérieur !',
    levelUpMessage: 'Félicitations ! Vous avez atteint le niveau {level} !',
    achievementUnlocked: 'Succès débloqué !',
    dailyChallenge: 'Défi du jour',
    dailyChallengeComplete: 'Défi accompli !',
    streak: 'Série',
    streakDays: '{n} jours consécutifs',
    xpLabel: 'Expérience',
    levelLabel: 'Niveau',
    achievements: 'Succès',
    viewAll: 'Tout voir',
    locked: 'Verrouillé',
    progress: 'Progression',
    welcomeTitle: 'Bienvenue sur TapTalk !',
    welcomeSubtitle: 'Améliorez votre anglais avec des tuteurs IA',
    getStarted: 'Commencer',
    selectProfile: 'Sélectionnez votre profil',
    selectInterests: 'Choisissez vos centres d\'intérêt',
    testYourMic: 'Testez votre microphone',
    meetTutors: 'Rencontrez les tuteurs IA',
    readyToGo: 'Vous êtes prêt !',
    next: 'Suivant',
    skip: 'Passer',
    letsStart: 'Commençons à parler',
  },
  es: {
    appName: 'TapTalk',
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    loading: 'Cargando...',
    continueWithGoogle: 'Continuar con Google',
    continueWithKakao: 'Continuar con Kakao',
    heroTitle: 'Practica inglés con',
    heroSubtitle: 'tutores de IA',
    heroDescription: 'Habla libremente durante 30 segundos y luego mantén una conversación natural. Recibe retroalimentación detallada después de tu sesión.',
    testMicrophone: 'Probar micrófono',
    clickToTest: 'Haz clic para probar',
    recording: 'Grabando...',
    speakNow: 'Habla ahora!',
    stop: 'Detener',
    processing: 'Procesando...',
    weHeard: 'Escuchamos:',
    error: 'Error:',
    testAgain: 'Probar de nuevo',
    micTestHint: 'Di algo para verificar que tu micrófono funciona',
    chooseTutor: 'Elige tu tutor',
    previewVoice: 'Escuchar voz',
    playing: 'Reproduciendo...',
    startConversation: 'Iniciar conversación',
    selectTutorPrompt: 'Selecciona un tutor para continuar',
    howItWorks: 'Cómo funciona',
    step1Title: 'Habla libremente',
    step1Desc: 'Habla durante 30 segundos sobre cualquier tema. Sin presión, solo habla naturalmente.',
    step2Title: 'Conversación natural',
    step2Desc: 'Tu tutor de IA continuará la conversación basándose en tu tema.',
    step3Title: 'Retroalimentación detallada',
    step3Desc: 'Recibe correcciones completas y mejores formas de expresarte.',
    contactUs: 'Contáctenos',
    footer: 'TapTalk - Práctica de inglés con IA',
    loginRequired: 'Inicia sesión para usar el servicio beta.',
    betaSignupPrompt: 'Regístrate para acceder a la versión beta.',
    betaSignupButton: 'Registrarse en la beta',
    signingUp: 'Registrando...',
    betaPending: 'Tu solicitud está en revisión. Espera la aprobación.',
    betaExpired: 'Tu suscripción ha expirado. Contacta soporte.',
    betaInactive: 'Tu cuenta está inactiva. Contacta soporte.',
    readyToStart: 'Listo para practicar con ',
    readyDescription: 'Tendrás 30 segundos para hablar libremente. Luego el tutor te entrevistará sobre tu tema.',
    sessionFlow: 'Flujo de la sesión',
    flowStep1: '30 segundos de habla libre',
    flowStep2: 'Entrevista con IA',
    flowStep3: 'Revisión de correcciones',
    flowStep4: 'Práctica de shadowing',
    flowStep5: 'Resumen de sesión',
    startFreeTalk: 'Iniciar habla libre',
    speakFreely: 'Habla libremente sobre cualquier tema!',
    keepGoing30: 'Continúa durante al menos 30 segundos',
    greatKeepGoing: 'Genial! Sigue si quieres!',
    moreYouShare: 'Cuanto más compartas, mejor será la conversación',
    doneSpeaking: 'Terminé de hablar',
    speaking: ' está hablando...',
    thinking: 'Pensando...',
    recordingVoice: 'Grabando tu voz...',
    tapToSpeak: 'Toca el botón de abajo para hablar',
    reply: 'Responder',
    done: 'Listo',
    listening: 'Escuchando...',
    analyzing: ' está revisando tu sesión...',
    analyzingDesc: 'Analizando tu conversación para darte retroalimentación',
    correction: 'Corrección',
    of: 'de',
    whatYouSaid: 'Lo que dijiste',
    whatYouMeant: 'Lo que quisiste decir',
    correctWay: 'La forma correcta',
    why: 'Por qué?',
    nextCorrection: 'Siguiente corrección',
    startShadowing: 'Iniciar shadowing',
    shadowing: 'Shadowing',
    listenAndRepeat: 'Escucha y repite:',
    tapToPlay: 'Toca para reproducir y practica en voz alta',
    practiceAloud: 'Practica en voz alta',
    nextSentence: 'Siguiente oración',
    viewSummary: 'Ver resumen',
    sessionComplete: 'Sesión completada!',
    whatYouDidWell: 'Lo que hiciste bien',
    areasToFocus: 'Áreas de mejora',
    backToHome: 'Volver al inicio',
    practiceAgain: 'Practicar de nuevo',
    exitSessionTitle: 'Terminar sesión?',
    exitSessionMessage: 'Tu progreso no se guardará.',
    exitSessionConfirm: 'Terminar',
    exitSessionCancel: 'Seguir aprendiendo',
    phaseReady: 'Listo para empezar',
    phaseFreeTalk: 'Habla libre',
    phaseConversation: 'Conversación',
    phaseAnalyzing: 'Analizando...',
    phaseReview: 'Revisión de correcciones',
    phaseShadowing: 'Práctica de shadowing',
    phaseComplete: 'Sesión completada',
    emmaDesc: 'Tu mejor amiga americana',
    emmaStyle: 'Divertida, expresiva, te anima siempre',
    jamesDesc: 'Amigo americano relajado',
    jamesStyle: 'Tranquilo, gracioso, gran narrador',
    charlotteDesc: 'Amiga británica ingeniosa',
    charlotteStyle: 'Encantadora, inteligente, gran conversadora',
    oliverDesc: 'Amigo británico genial',
    oliverStyle: 'Humor seco, genuino, fácil de hablar',
    alinaDesc: 'Amiga alegre y vivaz',
    alinaStyle: 'Animada, energética, siempre emocionada',
    henlyDesc: 'Amigo juguetón y curioso',
    henlyStyle: 'Aventurero, gracioso, lleno de preguntas',
    debateMode: 'Modo debate',
    debateLocked: 'Desbloqueo requerido',
    sessionsToUnlock: '{n} sesiones para desbloquear',
    sessionsCompleted: '{n}/5 sesiones completadas',
    startDebate: 'Iniciar debate',
    debateDescription: 'Practica debates en inglés con tutores de IA',
    proTeam: 'A favor',
    conTeam: 'En contra',
    yourTeam: 'Tu equipo',
    teamPartner: 'Compañero',
    opponents: 'Oponentes',
    you: 'Tú',
    topicReveal: 'Revelación del tema',
    teamAssignment: 'Asignación de equipos',
    openingStatements: 'Declaraciones iniciales',
    mainDebate: 'Debate principal',
    closingArguments: 'Argumentos finales',
    debateAnalysis: 'Análisis y retroalimentación',
    debateSummary: 'Resumen',
    yourTurn: 'Tu turno',
    listeningTo: 'Escuchando a {name}...',
    speakNowDebate: 'Habla ahora',
    waitingForSpeaker: 'Esperando al orador...',
    moderatorSpeaking: 'El moderador habla...',
    categorySocial: 'Social',
    categoryCulture: 'Cultura',
    categoryEnvironment: 'Medio ambiente',
    categoryPolitics: 'Política',
    categoryInternational: 'Internacional',
    categorySports: 'Deportes',
    vsText: 'VS',
    turnCount: 'Turno {current}/{total}',
    preparingDebate: 'Preparando debate...',
    assigningTeams: 'Asignando equipos...',
    revealingTopic: 'Revelando tema...',
    debateComplete: 'Debate completado!',
    yourPerformance: 'Tu rendimiento',
    grammarFeedback: 'Retroalimentación gramatical',
    keyExpressions: 'Expresiones clave',
    debateSummaryTitle: 'Resumen del debate',
    proArguments: 'Argumentos a favor',
    conArguments: 'Argumentos en contra',
    tryAnotherDebate: 'Intentar otro debate',
    nextSpeaker: 'Siguiente orador',
    skipIntro: 'Saltar',
    selectDecade: 'Selecciona una década',
    selectYear: 'Selecciona un año',
    birthYear: 'Año de nacimiento',
    xpEarned: 'XP ganado!',
    levelUp: 'Subida de nivel!',
    levelUpMessage: 'Felicidades! Alcanzaste el nivel {level}!',
    achievementUnlocked: 'Logro desbloqueado!',
    dailyChallenge: 'Desafío diario',
    dailyChallengeComplete: 'Desafío completado!',
    streak: 'Racha',
    streakDays: '{n} días seguidos',
    xpLabel: 'Experiencia',
    levelLabel: 'Nivel',
    achievements: 'Logros',
    viewAll: 'Ver todo',
    locked: 'Bloqueado',
    progress: 'Progreso',
    welcomeTitle: 'Bienvenido a TapTalk!',
    welcomeSubtitle: 'Mejora tu inglés con tutores de IA',
    getStarted: 'Empezar',
    selectProfile: 'Selecciona tu perfil',
    selectInterests: 'Elige tus intereses',
    testYourMic: 'Prueba tu micrófono',
    meetTutors: 'Conoce a los tutores de IA',
    readyToGo: 'Todo listo!',
    next: 'Siguiente',
    skip: 'Saltar',
    letsStart: 'Empecemos a hablar',
  },
  zh: {
    appName: 'TapTalk',
    signIn: '登录',
    signOut: '退出',
    loading: '加载中...',
    continueWithGoogle: '使用Google继续',
    continueWithKakao: '使用Kakao继续',
    heroTitle: '与AI导师一起',
    heroSubtitle: '练习英语',
    heroDescription: '自由说30秒，然后进行自然对话。课后获得详细反馈。',
    testMicrophone: '测试麦克风',
    clickToTest: '点击测试',
    recording: '录音中...',
    speakNow: '请说话！',
    stop: '停止',
    processing: '处理中...',
    weHeard: '我们听到了：',
    error: '错误：',
    testAgain: '重新测试',
    micTestHint: '说些什么来验证麦克风是否正常',
    chooseTutor: '选择你的导师',
    previewVoice: '试听声音',
    playing: '播放中...',
    startConversation: '开始对话',
    selectTutorPrompt: '请选择一位导师继续',
    howItWorks: '使用方法',
    step1Title: '自由表达',
    step1Desc: '用30秒谈论任何话题。放轻松，自然地说。',
    step2Title: '自然对话',
    step2Desc: 'AI导师会根据你的话题继续对话。',
    step3Title: '详细反馈',
    step3Desc: '获得全面的纠正和更好的表达方式。',
    contactUs: '联系我们',
    footer: 'TapTalk - AI英语会话练习',
    loginRequired: '请登录以使用测试版服务。',
    betaSignupPrompt: '注册获取测试版访问权限。',
    betaSignupButton: '注册测试版',
    signingUp: '注册中...',
    betaPending: '您的申请正在审核中，请等待批准。',
    betaExpired: '您的订阅已过期，请联系客服。',
    betaInactive: '您的账户已停用，请联系客服。',
    readyToStart: '准备与',
    readyDescription: '你将有30秒自由说话的时间。然后导师会就你的话题进行访谈。',
    sessionFlow: '课程流程',
    flowStep1: '30秒自由表达',
    flowStep2: 'AI访谈对话',
    flowStep3: '纠错复习',
    flowStep4: '跟读练习',
    flowStep5: '课程总结',
    startFreeTalk: '开始自由表达',
    speakFreely: '自由谈论任何话题！',
    keepGoing30: '至少说30秒',
    greatKeepGoing: '很好！可以继续说！',
    moreYouShare: '你说得越多，对话越精彩',
    doneSpeaking: '说完了',
    speaking: ' 正在说话...',
    thinking: '思考中...',
    recordingVoice: '正在录音...',
    tapToSpeak: '点击下方按钮开始说话',
    reply: '回复',
    done: '完成',
    listening: '聆听中...',
    analyzing: ' 正在分析你的课程...',
    analyzingDesc: '正在分析对话内容以提供反馈',
    correction: '纠正',
    of: '/',
    whatYouSaid: '你说的',
    whatYouMeant: '你想表达的',
    correctWay: '正确的说法',
    why: '为什么？',
    nextCorrection: '下一个纠正',
    startShadowing: '开始跟读',
    shadowing: '跟读',
    listenAndRepeat: '听并跟读：',
    tapToPlay: '点击播放，然后大声练习',
    practiceAloud: '大声练习',
    nextSentence: '下一句',
    viewSummary: '查看总结',
    sessionComplete: '课程完成！',
    whatYouDidWell: '做得好的方面',
    areasToFocus: '需要改进的方面',
    backToHome: '返回首页',
    practiceAgain: '再次练习',
    exitSessionTitle: '结束课程？',
    exitSessionMessage: '你的学习进度将不会被保存。',
    exitSessionConfirm: '结束',
    exitSessionCancel: '继续学习',
    phaseReady: '准备开始',
    phaseFreeTalk: '自由表达',
    phaseConversation: '对话',
    phaseAnalyzing: '分析中...',
    phaseReview: '纠错复习',
    phaseShadowing: '跟读练习',
    phaseComplete: '课程完成',
    emmaDesc: '你的美国好闺蜜',
    emmaStyle: '有趣、有表现力、为你加油',
    jamesDesc: '轻松的美国朋友',
    jamesStyle: '随和、幽默、会讲故事',
    charlotteDesc: '机智的英国朋友',
    charlotteStyle: '迷人、聪明、对话有趣',
    oliverDesc: '酷酷的英国朋友',
    oliverStyle: '冷幽默、真诚、好聊天',
    alinaDesc: '活泼开朗的朋友',
    alinaStyle: '快乐、有活力、总是兴奋',
    henlyDesc: '顽皮又好奇的伙伴',
    henlyStyle: '爱冒险、有趣、问题多多',
    debateMode: '辩论模式',
    debateLocked: '需要解锁',
    sessionsToUnlock: '还需{n}次课程解锁',
    sessionsCompleted: '{n}/5 课程已完成',
    startDebate: '开始辩论',
    debateDescription: '与AI导师练习英语辩论',
    proTeam: '正方',
    conTeam: '反方',
    yourTeam: '你的队伍',
    teamPartner: '队友',
    opponents: '对手',
    you: '你',
    topicReveal: '话题揭晓',
    teamAssignment: '分配队伍',
    openingStatements: '开场陈述',
    mainDebate: '主要辩论',
    closingArguments: '总结陈词',
    debateAnalysis: '反馈与分析',
    debateSummary: '总结',
    yourTurn: '轮到你了',
    listeningTo: '正在听{name}发言...',
    speakNowDebate: '请发言',
    waitingForSpeaker: '等待发言者...',
    moderatorSpeaking: '主持人发言中...',
    categorySocial: '社会',
    categoryCulture: '文化',
    categoryEnvironment: '环境',
    categoryPolitics: '政治',
    categoryInternational: '国际',
    categorySports: '体育',
    vsText: 'VS',
    turnCount: '第{current}/{total}轮',
    preparingDebate: '准备辩论...',
    assigningTeams: '分配队伍...',
    revealingTopic: '揭晓话题...',
    debateComplete: '辩论完成！',
    yourPerformance: '你的表现',
    grammarFeedback: '语法反馈',
    keyExpressions: '关键表达',
    debateSummaryTitle: '辩论总结',
    proArguments: '正方论点',
    conArguments: '反方论点',
    tryAnotherDebate: '再试一场辩论',
    nextSpeaker: '下一位发言者',
    skipIntro: '跳过',
    selectDecade: '选择年代',
    selectYear: '选择年份',
    birthYear: '出生年份',
    xpEarned: '获得XP！',
    levelUp: '升级！',
    levelUpMessage: '恭喜！你达到了{level}级！',
    achievementUnlocked: '成就解锁！',
    dailyChallenge: '每日挑战',
    dailyChallengeComplete: '挑战完成！',
    streak: '连续',
    streakDays: '连续{n}天',
    xpLabel: '经验值',
    levelLabel: '等级',
    achievements: '成就',
    viewAll: '查看全部',
    locked: '已锁定',
    progress: '进度',
    welcomeTitle: '欢迎来到TapTalk！',
    welcomeSubtitle: '与AI导师一起提高英语水平',
    getStarted: '开始',
    selectProfile: '选择你的个人资料',
    selectInterests: '选择你的兴趣',
    testYourMic: '测试你的麦克风',
    meetTutors: '认识AI导师',
    readyToGo: '一切就绪！',
    next: '下一步',
    skip: '跳过',
    letsStart: '开始对话吧',
  },
  de: {
    appName: 'TapTalk',
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    loading: 'Laden...',
    continueWithGoogle: 'Mit Google fortfahren',
    continueWithKakao: 'Mit Kakao fortfahren',
    heroTitle: 'Englisch üben mit',
    heroSubtitle: 'KI-Tutoren',
    heroDescription: 'Sprich 30 Sekunden frei und führe dann ein natürliches Gespräch. Erhalte detailliertes Feedback nach deiner Sitzung.',
    testMicrophone: 'Mikrofon testen',
    clickToTest: 'Zum Testen klicken',
    recording: 'Aufnahme...',
    speakNow: 'Sprich jetzt!',
    stop: 'Stopp',
    processing: 'Verarbeitung...',
    weHeard: 'Wir haben gehört:',
    error: 'Fehler:',
    testAgain: 'Erneut testen',
    micTestHint: 'Sage etwas, um zu prüfen, ob dein Mikrofon funktioniert',
    chooseTutor: 'Wähle deinen Tutor',
    previewVoice: 'Stimme anhören',
    playing: 'Wiedergabe...',
    startConversation: 'Gespräch starten',
    selectTutorPrompt: 'Bitte wähle einen Tutor aus',
    howItWorks: 'So funktioniert es',
    step1Title: 'Frei sprechen',
    step1Desc: 'Sprich 30 Sekunden über jedes Thema. Kein Druck, sprich einfach natürlich.',
    step2Title: 'Natürliches Gespräch',
    step2Desc: 'Dein KI-Tutor führt das Gespräch basierend auf deinem Thema weiter.',
    step3Title: 'Detailliertes Feedback',
    step3Desc: 'Erhalte umfassende Korrekturen und bessere Ausdrucksweisen.',
    contactUs: 'Kontaktieren Sie uns',
    footer: 'TapTalk - KI-Englisch-Konversationstraining',
    loginRequired: 'Melde dich an, um den Beta-Service zu nutzen.',
    betaSignupPrompt: 'Registriere dich für den Beta-Zugang.',
    betaSignupButton: 'Für Beta registrieren',
    signingUp: 'Registrierung...',
    betaPending: 'Deine Bewerbung wird geprüft. Bitte warte auf die Genehmigung.',
    betaExpired: 'Dein Abonnement ist abgelaufen. Kontaktiere den Support.',
    betaInactive: 'Dein Konto ist inaktiv. Kontaktiere den Support.',
    readyToStart: 'Bereit zum Üben mit ',
    readyDescription: 'Du hast 30 Sekunden zum freien Sprechen. Dann interviewt dich der Tutor zu deinem Thema.',
    sessionFlow: 'Sitzungsablauf',
    flowStep1: '30 Sekunden freies Sprechen',
    flowStep2: 'KI-Interview',
    flowStep3: 'Korrekturüberprüfung',
    flowStep4: 'Shadowing-Übung',
    flowStep5: 'Sitzungszusammenfassung',
    startFreeTalk: 'Freies Sprechen starten',
    speakFreely: 'Sprich frei über jedes Thema!',
    keepGoing30: 'Sprich mindestens 30 Sekunden weiter',
    greatKeepGoing: 'Super! Mach weiter, wenn du möchtest!',
    moreYouShare: 'Je mehr du teilst, desto besser das Gespräch',
    doneSpeaking: 'Fertig gesprochen',
    speaking: ' spricht...',
    thinking: 'Nachdenken...',
    recordingVoice: 'Stimme wird aufgenommen...',
    tapToSpeak: 'Tippe auf den Button unten, um zu sprechen',
    reply: 'Antworten',
    done: 'Fertig',
    listening: 'Zuhören...',
    analyzing: ' überprüft deine Sitzung...',
    analyzingDesc: 'Dein Gespräch wird für Feedback analysiert',
    correction: 'Korrektur',
    of: 'von',
    whatYouSaid: 'Was du gesagt hast',
    whatYouMeant: 'Was du meintest',
    correctWay: 'Die richtige Art es zu sagen',
    why: 'Warum?',
    nextCorrection: 'Nächste Korrektur',
    startShadowing: 'Shadowing starten',
    shadowing: 'Shadowing',
    listenAndRepeat: 'Höre zu und wiederhole:',
    tapToPlay: 'Tippe zum Abspielen und übe laut',
    practiceAloud: 'Übe laut',
    nextSentence: 'Nächster Satz',
    viewSummary: 'Zusammenfassung ansehen',
    sessionComplete: 'Sitzung abgeschlossen!',
    whatYouDidWell: 'Was du gut gemacht hast',
    areasToFocus: 'Verbesserungsbereiche',
    backToHome: 'Zurück zur Startseite',
    practiceAgain: 'Erneut üben',
    exitSessionTitle: 'Sitzung beenden?',
    exitSessionMessage: 'Dein Fortschritt wird nicht gespeichert.',
    exitSessionConfirm: 'Beenden',
    exitSessionCancel: 'Weiterlernen',
    phaseReady: 'Bereit zum Start',
    phaseFreeTalk: 'Freies Sprechen',
    phaseConversation: 'Gespräch',
    phaseAnalyzing: 'Analyse...',
    phaseReview: 'Korrekturüberprüfung',
    phaseShadowing: 'Shadowing-Übung',
    phaseComplete: 'Sitzung abgeschlossen',
    emmaDesc: 'Deine amerikanische beste Freundin',
    emmaStyle: 'Lustig, ausdrucksstark, feuert dich an',
    jamesDesc: 'Entspannter amerikanischer Kumpel',
    jamesStyle: 'Locker, witzig, toller Geschichtenerzähler',
    charlotteDesc: 'Geistreiche britische Freundin',
    charlotteStyle: 'Charmant, clever, tolle Unterhaltungen',
    oliverDesc: 'Cooler britischer Typ',
    oliverStyle: 'Trockener Humor, aufrichtig, leicht zu reden',
    alinaDesc: 'Fröhliche und lebhafte Freundin',
    alinaStyle: 'Heiter, energisch, immer begeistert',
    henlyDesc: 'Verspielter und neugieriger Freund',
    henlyStyle: 'Abenteuerlustig, lustig, voller Fragen',
    debateMode: 'Debattenmodus',
    debateLocked: 'Freischaltung erforderlich',
    sessionsToUnlock: 'Noch {n} Sitzungen zum Freischalten',
    sessionsCompleted: '{n}/5 Sitzungen abgeschlossen',
    startDebate: 'Debatte starten',
    debateDescription: 'Übe englische Debatten mit KI-Tutoren',
    proTeam: 'Dafür',
    conTeam: 'Dagegen',
    yourTeam: 'Dein Team',
    teamPartner: 'Teampartner',
    opponents: 'Gegner',
    you: 'Du',
    topicReveal: 'Themenvorstellung',
    teamAssignment: 'Teamzuteilung',
    openingStatements: 'Eröffnungsreden',
    mainDebate: 'Hauptdebatte',
    closingArguments: 'Schlussargumente',
    debateAnalysis: 'Feedback & Analyse',
    debateSummary: 'Zusammenfassung',
    yourTurn: 'Du bist dran',
    listeningTo: '{name} spricht...',
    speakNowDebate: 'Sprich jetzt',
    waitingForSpeaker: 'Warte auf Redner...',
    moderatorSpeaking: 'Moderator spricht...',
    categorySocial: 'Gesellschaft',
    categoryCulture: 'Kultur',
    categoryEnvironment: 'Umwelt',
    categoryPolitics: 'Politik',
    categoryInternational: 'International',
    categorySports: 'Sport',
    vsText: 'VS',
    turnCount: 'Runde {current}/{total}',
    preparingDebate: 'Debatte wird vorbereitet...',
    assigningTeams: 'Teams werden zugeteilt...',
    revealingTopic: 'Thema wird vorgestellt...',
    debateComplete: 'Debatte abgeschlossen!',
    yourPerformance: 'Deine Leistung',
    grammarFeedback: 'Grammatik-Feedback',
    keyExpressions: 'Wichtige Ausdrücke',
    debateSummaryTitle: 'Debattenzusammenfassung',
    proArguments: 'Argumente dafür',
    conArguments: 'Argumente dagegen',
    tryAnotherDebate: 'Weitere Debatte',
    nextSpeaker: 'Nächster Redner',
    skipIntro: 'Überspringen',
    selectDecade: 'Wähle ein Jahrzehnt',
    selectYear: 'Wähle ein Jahr',
    birthYear: 'Geburtsjahr',
    xpEarned: 'XP verdient!',
    levelUp: 'Level aufgestiegen!',
    levelUpMessage: 'Glückwunsch! Du hast Level {level} erreicht!',
    achievementUnlocked: 'Erfolg freigeschaltet!',
    dailyChallenge: 'Tägliche Herausforderung',
    dailyChallengeComplete: 'Herausforderung geschafft!',
    streak: 'Serie',
    streakDays: '{n} Tage in Folge',
    xpLabel: 'Erfahrung',
    levelLabel: 'Level',
    achievements: 'Erfolge',
    viewAll: 'Alle anzeigen',
    locked: 'Gesperrt',
    progress: 'Fortschritt',
    welcomeTitle: 'Willkommen bei TapTalk!',
    welcomeSubtitle: 'Verbessere dein Englisch mit KI-Tutoren',
    getStarted: 'Loslegen',
    selectProfile: 'Wähle dein Profil',
    selectInterests: 'Wähle deine Interessen',
    testYourMic: 'Teste dein Mikrofon',
    meetTutors: 'Lerne die KI-Tutoren kennen',
    readyToGo: 'Alles bereit!',
    next: 'Weiter',
    skip: 'Überspringen',
    letsStart: 'Lass uns anfangen',
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
      const validLangs: Language[] = ['ko', 'en', 'nl', 'ru', 'fr', 'es', 'zh', 'de'];
      if (saved && validLangs.includes(saved as Language)) {
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

const languageNames: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  nl: 'Nederlands',
  ru: 'Русский',
  fr: 'Français',
  es: 'Español',
  zh: '中文',
  de: 'Deutsch',
};

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-white/10 backdrop-blur-sm border border-neutral-200 dark:border-white/20 text-sm font-medium text-neutral-700 dark:text-white/80 hover:bg-neutral-200 dark:hover:bg-white/15 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span>{languageNames[language]}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 shadow-lg z-50 py-1 overflow-hidden">
            {(Object.keys(languageNames) as Language[]).map((code) => (
              <button
                key={code}
                onClick={() => { setLanguage(code); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  language === code
                    ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium'
                    : 'text-neutral-700 dark:text-white/70 hover:bg-neutral-50 dark:hover:bg-white/5'
                }`}
              >
                {languageNames[code]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
