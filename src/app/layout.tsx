import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import GlobalLayout from "@/components/GlobalLayout";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  ),
  title: "Cravemedia — Discover Movies, TV Shows & Books",
  description:
    "Describe what you're craving and get personalized recommendations for movies, TV shows, and books.",
  openGraph: {
    title: "Cravemedia — Discover Movies, TV Shows & Books",
    description:
      "AI-powered media recommendations based on your mood and preferences.",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Cravemedia — Discover Movies, TV Shows & Books",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cravemedia — Discover Movies, TV Shows & Books",
    description:
      "AI-powered media recommendations based on your mood and preferences.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Cravemedia — Discover Movies, TV Shows & Books",
      },
    ],
  },
};

import { ListsProvider } from "@/context/ListsContext";

// ...

import { createClient } from "@/lib/supabase/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={dmSans.variable}>
      <body className="bg-gradient-mesh min-h-screen">
        <NextTopLoader
          color="#a855f7"
          height={3}
          showSpinner={false}
          crawlSpeed={200}
        />
        <ListsProvider user={user}>
          <GlobalLayout user={user}>{children}</GlobalLayout>
        </ListsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
