import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "eiwi — AI Code Intelligence",
    template: "%s | eiwi",
  },
  description: "AI-powered code analysis. Pinpoint security vulnerabilities, blast radius, and tech debt across your GitHub repositories.",
  keywords: ["code analysis", "security audit", "tech debt", "AI code review", "GitHub"],
  authors: [{ name: "eiwi" }],
  openGraph: {
    title: "eiwi — AI Code Intelligence",
    description: "AI-powered code analysis for senior developers. Security vulnerabilities, blast radius, and tech debt in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}