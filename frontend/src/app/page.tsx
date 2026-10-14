import { Suspense, type ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { UserMenu } from "@/features/auth/components/user-menu";
import { AddLeadDialog } from "@/features/leads/components/add-lead-dialog";
import { LeadBoard } from "@/features/leads/components/lead-board";
import { LeadBoardSkeleton } from "@/features/leads/components/lead-board-skeleton";

function BoardShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <AppHeader actions={actions} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}

export default function HomePage() {
  const loading = (
    <BoardShell>
      <LeadBoardSkeleton />
    </BoardShell>
  );

  return (
    // The board reads the session, the URL and the current time, so it renders on the client.
    <Suspense fallback={loading}>
      <AuthGate fallback={loading}>
        <BoardShell
          actions={
            <div className="flex items-center gap-3 sm:gap-4">
              <AddLeadDialog />
              <UserMenu />
            </div>
          }
        >
          <LeadBoard />
        </BoardShell>
      </AuthGate>
    </Suspense>
  );
}
