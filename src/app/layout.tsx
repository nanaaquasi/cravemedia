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
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function getMetadataBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("localhost") ? `http://${raw}` : `https://${raw}`;
}

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBase()),
  title: "Craveo — Discover Movies, TV Shows & Books",
  description:
    "Describe what you're craving and get personalized recommendations for movies, TV shows, and books.",
  openGraph: {
    title: "Craveo — Discover Movies, TV Shows & Books",
    description:
      "AI-powered media recommendations based on your mood and preferences.",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Craveo — Discover Movies, TV Shows & Books",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Craveo — Discover Movies, TV Shows & Books",
    description:
      "AI-powered media recommendations based on your mood and preferences.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Craveo — Discover Movies, TV Shows & Books",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

import { ListsProvider } from "@/context/ListsContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="bg-gradient-mesh min-h-screen overflow-x-clip">
        <NextTopLoader
          color="#a855f7"
          height={3}
          showSpinner={false}
          crawlSpeed={200}
        />
        <ListsProvider user={null}>
          <GlobalLayout user={null}>{children}</GlobalLayout>
        </ListsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
