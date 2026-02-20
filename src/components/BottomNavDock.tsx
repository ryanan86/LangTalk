'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavDock() {
  const pathname = usePathname();

  // Hide dock on /talk page
  if (pathname?.startsWith('/talk')) {
    return null;
  }

  const navItems = [
    {
      href: '/',
      label: '홈',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      href: '/history',
      label: '기록',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="8" />
          <polyline points="10 6 10 10 13 13" />
        </svg>
      ),
    },
    {
      href: '/talk',
      label: '대화',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      ),
      isFab: true,
    },
    {
      href: '/tutors',
      label: '튜터',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: '프로필',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-50 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="h-16 dark:bg-slate-950/80 bg-white/90 backdrop-blur-xl border dark:border-white/10 border-black/[0.08] shadow-2xl rounded-2xl px-4 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            if (item.isFab) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-8 w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-[0_0_20px_rgba(124,58,237,0.4)] active:scale-95 transition-transform text-white"
                >
                  {item.icon}
                  <span className="text-[10px] mt-1">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center transition-colors ${
                  isActive ? 'text-violet-400' : 'dark:text-slate-500 text-zinc-400'
                }`}
              >
                {item.icon}
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
