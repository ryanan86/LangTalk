import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "LangTalk - AI English Conversation",
  description: "Practice English conversation with AI tutors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-neutral-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
