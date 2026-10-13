/** Types mirroring the LeadFlow API schemas (backend/app/schemas). */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type DiscussionKind = "note" | "system";

/** ISO 8601 timestamp string as returned by the API (always UTC). */
export type IsoDateTime = string;

export interface DiscussionPreview {
  body: string;
  kind: DiscussionKind;
  created_at: IsoDateTime;
}

export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  next_follow_up_at: IsoDateTime | null;
  last_activity_at: IsoDateTime;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  last_discussion: DiscussionPreview | null;
}

export interface Discussion {
  id: number;
  lead_id: number;
  body: string;
  kind: DiscussionKind;
  follow_up_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

export interface DiscussionCreated {
  discussion: Discussion;
  lead: Lead;
}

export interface LeadFilters {
  status: LeadStatus | null;
  search: string;
}

export interface LeadCreateInput {
  name: string;
  company?: string;
  phone?: string;
}

export interface LeadUpdateInput {
  name?: string;
  company?: string | null;
  phone?: string | null;
  status?: LeadStatus;
}

export interface DiscussionCreateInput {
  body: string;
  follow_up_at?: IsoDateTime | null;
  clear_follow_up?: boolean;
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}
