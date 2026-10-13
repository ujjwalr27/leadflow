import { Bell, CalendarClock, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatDateTime, formatDayAndTime, formatRelative } from "@/lib/time";

import type { FollowUpState } from "../lib/follow-ups";

const STYLES = {
  overdue: { icon: TriangleAlert, className: "bg-red-100 text-red-700" },
  today: { icon: Bell, className: "bg-blue-100 text-blue-700" },
  upcoming: { icon: CalendarClock, className: "bg-gray-100 text-gray-600" },
} as const;

function label(state: Exclude<FollowUpState, "none">, iso: string, now: Date): string {
  switch (state) {
    case "overdue":
      return `Overdue · was due ${formatRelative(iso, now)}`;
    case "today":
    case "upcoming":
      return `Follow-up ${formatDayAndTime(iso, now)}`;
  }
}

interface FollowUpTagProps {
  iso: string;
  state: Exclude<FollowUpState, "none">;
  now: Date;
  className?: string;
}

export function FollowUpTag({ iso, state, now, className }: FollowUpTagProps) {
  const { icon: Icon, className: tone } = STYLES[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <time dateTime={iso} title={formatDateTime(iso, now)}>
        {label(state, iso, now)}
      </time>
    </span>
  );
}
