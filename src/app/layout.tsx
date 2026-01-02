import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "XLearner - Transform Your Bookmarks Into Learning",
    template: "%s | XLearner",
  },
  description:
    "Turn your Twitter/X bookmarks into personalized learning courses with AI-generated podcasts and quizzes.",
  keywords: [
    "learning",
    "twitter bookmarks",
    "education",
    "podcast",
    "AI courses",
  ],
  authors: [{ name: "XLearner" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://xlearner.app",
    siteName: "XLearner",
    title: "XLearner - Transform Your Bookmarks Into Learning",
    description:
      "Turn your Twitter/X bookmarks into personalized learning courses.",
  },
  twitter: {
    card: "summary_large_image",
    title: "XLearner",
    description:
      "Turn your Twitter/X bookmarks into personalized learning courses.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
