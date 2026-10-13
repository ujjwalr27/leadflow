import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { LeadBoard } from "@/features/leads/components/lead-board";
import { LeadBoardSkeleton } from "@/features/leads/components/lead-board-skeleton";

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* The board reads the URL and the current time, so it renders on the client. */}
        <Suspense fallback={<LeadBoardSkeleton />}>
          <LeadBoard />
        </Suspense>
      </main>
    </>
  );
}
