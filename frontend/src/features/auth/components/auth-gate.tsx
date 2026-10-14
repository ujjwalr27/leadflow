"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/ui/states";
import { errorMessage, isUnauthenticated } from "@/lib/api-client";

import { useCurrentUser } from "../queries";

interface AuthGateProps {
  /** Rendered once the session is confirmed (read the user with `useCurrentUser`). */
  children: ReactNode;
  /** Shown while the session is checked (and while redirecting to /login). */
  fallback: ReactNode;
}

/**
 * Renders `children` only for a signed-in user. A missing or expired session is sent to the
 * login page by the global 401 handler (see AppProviders).
 */
export function AuthGate({ children, fallback }: AuthGateProps) {
  const currentUser = useCurrentUser();

  if (currentUser.data) return children;
  if (currentUser.isError && !isUnauthenticated(currentUser.error)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <ErrorState
          message={errorMessage(currentUser.error)}
          onRetry={() => currentUser.refetch()}
          retrying={currentUser.isFetching}
        />
      </div>
    );
  }
  return fallback;
}
