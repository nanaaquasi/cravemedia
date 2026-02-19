import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
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
  title: "Cravemedia — Discover Movies, TV Shows & Books",
  description:
    "Describe what you're craving and get personalized recommendations for movies, TV shows, and books.",
  openGraph: {
    title: "Cravemedia — Discover Movies, TV Shows & Books",
    description:
      "AI-powered media recommendations based on your mood and preferences.",
    type: "website",
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
        <ListsProvider>
          <GlobalLayout user={user}>{children}</GlobalLayout>
        </ListsProvider>
      </body>
    </html>
  );
}
