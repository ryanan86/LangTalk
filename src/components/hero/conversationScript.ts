export interface ChatMessage {
  role: 'ai' | 'user' | 'correction';
  text: string;
  correctionOriginal?: string;
  correctionFixed?: string;
  correctionExplanation?: string;
}

export interface ConversationScenario {
  tutorName: string;
  tutorEmoji: string;
  tutorColor: string; // tailwind gradient classes
  messages: ChatMessage[];
}

export const conversations: ConversationScenario[] = [
  {
    tutorName: 'Emma',
    tutorEmoji: '👩🏼',
    tutorColor: 'from-pink-500 to-rose-500',
    messages: [
      { role: 'ai', text: 'Hey! What did you do this weekend? 😊' },
      { role: 'user', text: 'I was go to the beach with my friends.' },
      {
        role: 'correction',
        text: '',
        correctionOriginal: 'was go',
        correctionFixed: 'went',
        correctionExplanation: 'Use past tense "went" instead of "was go"',
      },
      { role: 'ai', text: 'That sounds fun! "I went to the beach." What did you do there?' },
    ],
  },
  {
    tutorName: 'James',
    tutorEmoji: '👨🏻',
    tutorColor: 'from-blue-500 to-cyan-500',
    messages: [
      { role: 'ai', text: "What's your favorite way to relax after work?" },
      { role: 'user', text: 'I like to see Netflix and eat snacks.' },
      {
        role: 'correction',
        text: '',
        correctionOriginal: 'see Netflix',
        correctionFixed: 'watch Netflix',
        correctionExplanation: '"Watch" is used for screens and shows',
      },
      { role: 'ai', text: 'Nice! "I like to watch Netflix." What are you watching these days?' },
    ],
  },
  {
    tutorName: 'Charlotte',
    tutorEmoji: '👩🏽',
    tutorColor: 'from-violet-500 to-purple-500',
    messages: [
      { role: 'ai', text: "What's been keeping you busy lately?" },
      { role: 'user', text: 'I want to speak English more better.' },
      {
        role: 'correction',
        text: '',
        correctionOriginal: 'more better',
        correctionFixed: 'better',
        correctionExplanation: '"Better" is already comparative — no need for "more"',
      },
      { role: 'ai', text: 'Great goal! Just say "speak English better." You\'re doing great! 💪' },
    ],
  },
];
