import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "CurateAI — Discover Movies, TV Shows & Books",
  description:
    "AI-powered media recommendations. Describe what you're in the mood for and get curated lists of movies, TV shows, and books.",
  openGraph: {
    title: "CurateAI — Discover Movies, TV Shows & Books",
    description:
      "AI-powered media recommendations based on your mood and preferences.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="bg-gradient-mesh min-h-screen">{children}</body>
    </html>
  );
}
