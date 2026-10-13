import { cn } from "@/lib/cn";

import { STATUS_META } from "../constants";
import type { LeadStatus } from "../types";

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ring-1 ring-inset",
        meta.badge,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
