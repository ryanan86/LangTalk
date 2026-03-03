import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

const ADMIN_EMAILS = ['ryan@nuklabs.com', 'taewoongan@gmail.com'];

const navLinks = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/topics', label: 'Topics' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/tts-test', label: 'TTS Test' },
  { href: '/admin/setup', label: 'Setup' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-neutral-400">관리자 권한이 필요합니다.</p>
          <a href="/" className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm">
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col sm:flex-row">
      {/* Sidebar — desktop */}
      <aside className="hidden sm:flex flex-col w-52 shrink-0 bg-neutral-950 border-r border-neutral-800 p-4">
        <div className="mb-6">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Admin</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-neutral-800">
          <a href="/" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            &larr; 홈으로
          </a>
        </div>
      </aside>

      {/* Top tabs — mobile */}
      <div className="sm:hidden overflow-x-auto bg-neutral-950 border-b border-neutral-800">
        <nav className="flex gap-1 p-2 min-w-max">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
