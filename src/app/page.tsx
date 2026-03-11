import { Suspense } from "react";
import AskContent from "@/app/ask/AskContent";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center" />
      }
    >
      <AskContent />
    </Suspense>
  );
}
