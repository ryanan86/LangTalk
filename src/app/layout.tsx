import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { LanguageProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://taptalk.xyz'),
  title: "TapTalk - AI English Conversation Practice",
  description: "Practice English conversation with AI tutors. Get real-time feedback on grammar, vocabulary, and fluency.",
  keywords: ['English learning', 'AI tutor', 'conversation practice', 'speaking practice', 'English speaking', 'AI English'],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TapTalk',
  },
  openGraph: {
    title: 'TapTalk - AI English Conversation Practice',
    description: 'Practice English with AI tutors anytime, anywhere.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ko_KR'],
    siteName: 'TapTalk',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TapTalk - AI English Conversation Practice',
    description: 'Practice English with AI tutors anytime, anywhere.',
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
};

// Inline script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('taptalk-theme');
      if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
      }
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch(e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const lang = cookieStore.get('lang')?.value || 'en';

  return (
    <html lang={lang} translate="no" className="dark" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased min-h-screen bg-theme">
        <GoogleAnalytics />
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
