"use client";

import { CalendarDays } from "lucide-react";

import { ErrorState, Skeleton } from "@/components/ui/states";
import { useNow } from "@/hooks/use-now";
import { errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/time";

import { useDiscussions } from "../../queries";
import type { Discussion } from "../../types";

/** The lead's discussion history, newest first, on a vertical rail. */
export function Timeline({ leadId }: { leadId: number }) {
  const discussionsQuery = useDiscussions(leadId);
  const now = useNow();

  if (discussionsQuery.isPending) return <TimelineSkeleton />;
  if (discussionsQuery.isError) {
    return (
      <ErrorState
        message={errorMessage(discussionsQuery.error)}
        onRetry={() => discussionsQuery.refetch()}
        retrying={discussionsQuery.isFetching}
      />
    );
  }

  const discussions = discussionsQuery.data;
  return (
    <ol aria-label="Discussion history" className="space-y-6">
      {discussions.map((discussion, index) => (
        <TimelineItem
          key={discussion.id}
          discussion={discussion}
          now={now}
          latest={index === 0}
          last={index === discussions.length - 1}
        />
      ))}
    </ol>
  );
}

interface TimelineItemProps {
  discussion: Discussion;
  now: Date;
  latest: boolean;
  last: boolean;
}

function TimelineItem({ discussion, now, latest, last }: TimelineItemProps) {
  const system = discussion.kind === "system";

  return (
    <li className="relative pl-8">
      {!last && (
        <span className="absolute top-5 -bottom-6 left-[5px] w-px bg-gray-200" aria-hidden />
      )}
      <span
        className={cn(
          "absolute top-1.5 left-0 size-[11px] rounded-full",
          latest ? "bg-blue-600 ring-4 ring-blue-100" : "bg-gray-300 ring-4 ring-white",
        )}
        aria-hidden
      />

      <p className="text-xs text-gray-500">
        <time dateTime={discussion.created_at}>{formatDateTime(discussion.created_at, now)}</time>
        <span className="ml-2 text-gray-400">({formatRelative(discussion.created_at, now)})</span>
      </p>

      <div className="mt-2 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm shadow-xs">
        <p
          className={cn(
            "break-words whitespace-pre-wrap",
            system ? "text-gray-600 italic" : "text-gray-800",
          )}
        >
          {system && <span className="sr-only">System entry: </span>}
          {discussion.body}
        </p>
        {discussion.follow_up_at && (
          <p className="mt-2.5 inline-flex items-start gap-1.5 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            <CalendarDays className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>
              Follow-up set for:{" "}
              <time dateTime={discussion.follow_up_at}>
                {formatDateTime(discussion.follow_up_at, now)}
              </time>
            </span>
          </p>
        )}
      </div>
    </li>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading discussions">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="pl-8">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-14 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
