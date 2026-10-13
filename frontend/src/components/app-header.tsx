import { TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function AppHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-blue-600">
          <TrendingUp className="size-6" strokeWidth={2.5} aria-hidden />
          <span className="text-2xl font-bold tracking-tight">LeadFlow</span>
        </Link>
        {actions}
      </div>
    </header>
  );
}
