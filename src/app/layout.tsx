import type { Metadata } from "next";
import { Syne } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import GlobalLayout from "@/components/GlobalLayout";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionUser } from "@/app/api/auth/session/route";
import { SerwistProvider } from "./serwist";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020205",
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

const APP_NAME = "Craveo";
const APP_DEFAULT_TITLE = "Craveo — Discover Movies, TV Shows & Books";
const APP_TITLE_TEMPLATE = "%s — Craveo";
const APP_DESCRIPTION =
  "Describe what you're craving and get personalized recommendations for movies, TV shows, and books.";

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBase()),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description:
      "AI-powered media recommendations based on your mood and preferences.",
    type: "website",
    siteName: APP_NAME,
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: APP_DEFAULT_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description:
      "AI-powered media recommendations based on your mood and preferences.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: APP_DEFAULT_TITLE,
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
import { SessionProvider } from "@/context/SessionContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const initialUser = await resolveSessionUser(supabase);

  return (
    <html lang="en" className={`${syne.variable}`}>
      <body className="bg-gradient-mesh min-h-screen overflow-x-clip">
        <NextTopLoader
          color="#a855f7"
          height={3}
          showSpinner={false}
          crawlSpeed={200}
        />
        <SerwistProvider swUrl="/serwist/sw.js">
          <SessionProvider initialUser={initialUser}>
            <ListsProvider>
              <NetworkStatusIndicator />
              <GlobalLayout>{children}</GlobalLayout>
              <PWAInstallPrompt />
              <PWAUpdatePrompt />
            </ListsProvider>
          </SessionProvider>
        </SerwistProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
