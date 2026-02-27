'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

interface BottomNavProps {
  hidden?: boolean;
}

const tabs = [
  { key: 'home' as const, href: '/' },
  { key: 'talk' as const, href: '/talk' },
  { key: 'review' as const, href: '/review' },
  { key: 'vocab' as const, href: '/vocab-book' },
  { key: 'profile' as const, href: '/profile' },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function TalkIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ReviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function VocabIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="13" y2="11" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const iconMap = {
  home: HomeIcon,
  talk: TalkIcon,
  review: ReviewIcon,
  vocab: VocabIcon,
  profile: ProfileIcon,
};

const labelMap = {
  home: 'navHome' as const,
  talk: 'navTalk' as const,
  review: 'navReview' as const,
  vocab: 'navVocab' as const,
  profile: 'navProfile' as const,
};

const ariaLabelMap = {
  home: 'Home',
  talk: 'Talk - Start conversation',
  review: 'Review',
  vocab: 'Vocabulary book',
  profile: 'Profile',
};

export default function BottomNav({ hidden }: BottomNavProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (hidden) return null;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 transition-transform duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);
          const Icon = iconMap[tab.key];
          const isTalk = tab.key === 'talk';

          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-label={ariaLabelMap[tab.key]}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[56px] min-h-[56px] py-2 px-1
                transition-all duration-200 ease-out
                ${isTalk ? '-mt-2' : ''}
              `}
              style={{ minWidth: 44, minHeight: 44 }}
            >
              {/* Active indicator glow */}
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />
              )}

              {/* Talk button special styling */}
              {isTalk ? (
                <span
                  aria-hidden="true"
                  className={`
                    flex items-center justify-center w-12 h-12 rounded-full
                    transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                    }
                  `}
                >
                  <Icon active={isActive} />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className={`
                    transition-colors duration-200
                    ${isActive
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-neutral-400 dark:text-neutral-500'
                    }
                  `}
                >
                  <Icon active={isActive} />
                </span>
              )}

              {/* Label */}
              <span
                className={`
                  text-[10px] font-medium leading-tight transition-colors duration-200
                  ${isTalk ? 'mt-0.5' : ''}
                  ${isActive
                    ? 'bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent'
                    : 'text-neutral-400 dark:text-neutral-500'
                  }
                `}
              >
                {t[labelMap[tab.key]]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
