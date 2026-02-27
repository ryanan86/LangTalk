export type Language = 'ko' | 'en' | 'nl' | 'ru' | 'fr' | 'es' | 'zh' | 'de';

export interface Translations {
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
  henryDesc: string;
  henryStyle: string;

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
  passedThisTurn: string;

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

  // Login page
  welcomeBack: string;
  aiEnglishPractice: string;
  accessDenied: string;
  loginError: string;
  orDivider: string;
  termsAgreement: string;

  // Bottom Navigation
  navHome: string;
  navTalk: string;
  navReview: string;
  navVocab: string;
  navProfile: string;
}
