import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/time";

import { STATUS_META } from "../constants";
import { classifyFollowUp } from "../lib/follow-ups";
import type { Lead } from "../types";
import { FollowUpTag } from "./follow-up-tag";
import { StatusBadge } from "./status-badge";

interface LeadCardProps {
  lead: Lead;
  now: Date;
  onOpen: (leadId: number) => void;
}

const CARD_TONE = {
  overdue: "border-red-200 bg-red-50/70 hover:border-red-300",
  today: "border-blue-200 bg-blue-50/70 hover:border-blue-300",
  closed: "border-gray-200 bg-gray-50 hover:border-gray-300",
  default: "border-gray-200 bg-white hover:border-gray-300",
} as const;

export function LeadCard({ lead, now, onOpen }: LeadCardProps) {
  const followUp = classifyFollowUp(lead.next_follow_up_at, now);
  const closed = STATUS_META[lead.status].closed;
  const tone =
    followUp === "overdue" || followUp === "today" ? followUp : closed ? "closed" : "default";
  const lastNote = lead.last_discussion;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        aria-haspopup="dialog"
        className={cn(
          "w-full rounded-lg border px-4 py-3.5 text-left shadow-xs transition hover:shadow-md sm:px-5",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
          CARD_TONE[tone],
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate">
            <span
              className={cn("text-base font-semibold", closed ? "text-gray-500" : "text-gray-900")}
            >
              {lead.name}
            </span>
            {lead.company && <span className="ml-1.5 text-sm text-gray-500">({lead.company})</span>}
          </p>
          <StatusBadge status={lead.status} />
        </div>

        <p
          className={cn(
            "mt-1.5 flex min-w-0 items-baseline gap-2 text-sm",
            closed ? "text-gray-500" : "text-gray-700",
          )}
        >
          {lastNote ? (
            <>
              <span className="min-w-0 truncate">
                <span className="font-semibold text-gray-800">Last Note:</span>{" "}
                <span className={cn(lastNote.kind === "system" && "italic")}>{lastNote.body}</span>
              </span>
              <time
                dateTime={lastNote.created_at}
                title={formatDateTime(lastNote.created_at, now)}
                className="shrink-0 text-xs text-gray-400"
              >
                {formatRelative(lastNote.created_at, now)}
              </time>
            </>
          ) : (
            <span className="text-gray-400 italic">No discussions yet</span>
          )}
        </p>

        {lead.next_follow_up_at && followUp !== "none" && (
          <FollowUpTag iso={lead.next_follow_up_at} state={followUp} now={now} className="mt-3" />
        )}
      </button>
    </li>
  );
}
