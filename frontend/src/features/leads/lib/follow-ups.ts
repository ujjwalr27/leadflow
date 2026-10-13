import { isSameDay } from "date-fns";

import type { Lead } from "../types";

/**
 * Where a follow-up falls relative to `now`, in the viewer's local timezone.
 *
 * - `overdue`  — the follow-up time has passed (even if it was earlier today)
 * - `today`    — later today
 * - `upcoming` — after today
 * - `none`     — no follow-up scheduled
 */
export type FollowUpState = "overdue" | "today" | "upcoming" | "none";

export function classifyFollowUp(iso: string | null, now: Date): FollowUpState {
  if (!iso) return "none";
  const followUp = new Date(iso);
  if (followUp.getTime() < now.getTime()) return "overdue";
  if (isSameDay(followUp, now)) return "today";
  return "upcoming";
}

/** A follow-up that needs attention now: overdue or due later today. */
export function isFollowUpDue(state: FollowUpState): boolean {
  return state === "overdue" || state === "today";
}

export interface PartitionedLeads {
  /** Overdue and due-today follow-ups, most urgent (earliest) first. */
  pinned: Lead[];
  /** Everything else, most recently active first. */
  others: Lead[];
}

const time = (iso: string) => new Date(iso).getTime();

/** Split leads into the pinned "Today's follow-ups" section and the rest. */
export function partitionLeads(leads: readonly Lead[], now: Date): PartitionedLeads {
  const pinned: Lead[] = [];
  const others: Lead[] = [];

  for (const lead of leads) {
    const state = classifyFollowUp(lead.next_follow_up_at, now);
    (isFollowUpDue(state) ? pinned : others).push(lead);
  }

  pinned.sort((a, b) => time(a.next_follow_up_at!) - time(b.next_follow_up_at!));
  others.sort((a, b) => time(b.last_activity_at) - time(a.last_activity_at) || b.id - a.id);
  return { pinned, others };
}
