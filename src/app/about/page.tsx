'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import TapTalkLogo from '@/components/TapTalkLogo';

export default function AboutPage() {
  const { language } = useLanguage();

  const content = {
    ko: {
      title: 'TapTalk 소개',
      subtitle: 'AI 튜터와 함께하는 새로운 영어 회화 학습',
      heroDescription: '원어민 수준의 AI 튜터와 실시간 대화하며 자연스럽게 영어 실력을 향상시키세요. 부담 없이 언제 어디서나 연습할 수 있습니다.',
      features: {
        title: '핵심 기능',
        items: [
          {
            title: '실시간 AI 대화',
            description: '고급 AI 기술로 구현된 원어민 수준의 튜터와 자연스러운 대화를 나눠보세요. 문맥을 이해하고 적절한 응답을 제공합니다.',
          },
          {
            title: '음성 인식 & TTS',
            description: '최신 음성 인식 기술로 발음을 정확히 인식하고, 자연스러운 TTS로 원어민의 발음을 들을 수 있습니다.',
          },
          {
            title: '실시간 피드백',
            description: '대화가 끝나면 문법, 어휘, 문장 구조에 대한 상세한 피드백과 교정을 받을 수 있습니다.',
          },
          {
            title: '정량적 평가 시스템',
            description: 'WPM(분당 단어 수), 어휘 다양성, 문장 복잡도 등 객관적인 지표로 실력을 측정합니다.',
          },
        ],
      },
      tutors: {
        title: 'AI 튜터 소개',
        description: '각기 다른 개성과 전문성을 가진 AI 튜터를 선택하세요.',
        items: [
          { name: 'Emma', specialty: '비즈니스 영어', accent: '미국식' },
          { name: 'Oliver', specialty: '일상 회화', accent: '영국식' },
          { name: 'Sophia', specialty: '여행 영어', accent: '미국식' },
          { name: 'James', specialty: '면접 준비', accent: '영국식' },
        ],
      },
      evaluation: {
        title: '평가 시스템',
        description: '단순한 점수가 아닌, 실제 영어 실력을 반영하는 다차원적 평가',
        metrics: [
          { name: 'WPM', description: '분당 단어 수 - 발화 속도 측정' },
          { name: '어휘 다양성', description: 'TTR 지표로 사용 어휘 범위 분석' },
          { name: '문장 복잡도', description: '복합문 사용 비율 분석' },
          { name: '문법 정확도', description: '문법 오류율 추적' },
          { name: '응답 속도', description: '평균 응답 시간 측정' },
        ],
      },
      cta: {
        title: '지금 시작하세요',
        description: '무료로 AI 튜터와 영어 회화를 시작해보세요.',
        button: '무료체험 신청하기',
      },
    },
    en: {
      title: 'About TapTalk',
      subtitle: 'A New Way to Learn English Conversation with AI Tutors',
      heroDescription: 'Improve your English naturally through real-time conversations with native-level AI tutors. Practice anytime, anywhere without pressure.',
      features: {
        title: 'Key Features',
        items: [
          {
            title: 'Real-time AI Conversation',
            description: 'Have natural conversations with native-level tutors powered by advanced AI technology. They understand context and provide appropriate responses.',
          },
          {
            title: 'Speech Recognition & TTS',
            description: 'State-of-the-art speech recognition accurately captures your pronunciation, while natural TTS lets you hear native pronunciation.',
          },
          {
            title: 'Real-time Feedback',
            description: 'After each conversation, receive detailed feedback and corrections on grammar, vocabulary, and sentence structure.',
          },
          {
            title: 'Quantitative Evaluation',
            description: 'Measure your skills with objective metrics like WPM, vocabulary diversity, and sentence complexity.',
          },
        ],
      },
      tutors: {
        title: 'Meet Our AI Tutors',
        description: 'Choose from AI tutors with different personalities and specialties.',
        items: [
          { name: 'Emma', specialty: 'Business English', accent: 'American' },
          { name: 'Oliver', specialty: 'Daily Conversation', accent: 'British' },
          { name: 'Sophia', specialty: 'Travel English', accent: 'American' },
          { name: 'James', specialty: 'Interview Prep', accent: 'British' },
        ],
      },
      evaluation: {
        title: 'Evaluation System',
        description: 'Multi-dimensional assessment that reflects real English proficiency, not just simple scores',
        metrics: [
          { name: 'WPM', description: 'Words Per Minute - Speaking rate measurement' },
          { name: 'Vocabulary Diversity', description: 'TTR analysis of vocabulary range' },
          { name: 'Sentence Complexity', description: 'Compound sentence usage ratio' },
          { name: 'Grammar Accuracy', description: 'Grammar error rate tracking' },
          { name: 'Response Speed', description: 'Average response time measurement' },
        ],
      },
      cta: {
        title: 'Get Started Today',
        description: 'Start practicing English conversation with AI tutors for free.',
        button: 'Start Free Trial',
      },
    },
  };

  const t = content[language as 'ko' | 'en'] || content['en'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <TapTalkLogo size="md" theme="dark" />
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all"
            >
              {language === 'ko' ? '홈으로' : 'Home'}
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="relative z-10">
        {/* Hero Section */}
        <section className="pt-16 pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">{t.title}</h1>
            <p className="text-xl text-purple-300 mb-6">{t.subtitle}</p>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">{t.heroDescription}</p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-white text-center mb-12">{t.features.title}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {t.features.items.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
                    {index === 0 && (
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                    {index === 1 && (
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                    {index === 2 && (
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {index === 3 && (
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tutors Section */}
        <section className="py-16 bg-black/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-white text-center mb-4">{t.tutors.title}</h2>
            <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">{t.tutors.description}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.tutors.items.map((tutor, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 text-center hover:border-purple-500/50 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{tutor.name}</h3>
                  <p className="text-purple-300 text-sm mb-1">{tutor.specialty}</p>
                  <p className="text-white/40 text-sm">{tutor.accent}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Evaluation Section */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-white text-center mb-4">{t.evaluation.title}</h2>
            <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">{t.evaluation.description}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {t.evaluation.metrics.map((metric, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{metric.name}</h3>
                  <p className="text-white/50 text-xs">{metric.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <h2 className="text-3xl font-bold text-white mb-4">{t.cta.title}</h2>
              <p className="text-white/60 mb-8">{t.cta.description}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all"
              >
                {t.cta.button}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/40 text-sm">
            {language === 'ko' ? '© 2024 TapTalk. All rights reserved.' : '© 2024 TapTalk. All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
