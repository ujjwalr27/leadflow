"use client";

import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api-client";

import { useCurrentUser, useLogout } from "../queries";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Signed-in user's avatar, name and a sign-out button. Render inside `AuthGate`. */
export function UserMenu() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className="flex size-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white"
        title={`${user.name} (${user.email})`}
        aria-hidden
      >
        {initials(user.name) || "?"}
      </span>
      <span className="hidden text-sm font-medium text-gray-700 md:inline">{user.name}</span>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Sign out"
        title="Sign out"
        loading={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, {
            onError: (error) => toast.error(`Couldn't sign out: ${errorMessage(error)}`),
          })
        }
      >
        {!logout.isPending && <LogOut className="size-4" aria-hidden />}
      </Button>
    </div>
  );
}
