import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "LangTalk - AI 영어 회화 연습",
  description: "AI 튜터와 함께하는 영어 회화 연습 | Practice English conversation with AI tutors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-neutral-50">
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
