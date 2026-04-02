import type { Metadata } from "next";
import OfflineContent from "./OfflineContent";

export const metadata: Metadata = {
  title: "Offline — Craveo",
  description: "You are currently offline.",
};

export default function OfflinePage() {
  return <OfflineContent />;
}
