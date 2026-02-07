import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { LanguageProvider } from "@/lib/i18n";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const lang = cookieStore.get('lang')?.value || 'ko';

  return (
    <html lang={lang} translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen bg-neutral-50">
        <GoogleAnalytics />
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
