import type { LeadStatus } from "./types";

interface StatusMeta {
  label: string;
  /** Tailwind classes for the status badge. */
  badge: string;
  /** Closed deals are visually de-emphasised in the list. */
  closed: boolean;
}

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  new: {
    label: "New",
    badge: "bg-green-50 text-green-700 ring-green-200",
    closed: false,
  },
  contacted: {
    label: "Contacted",
    badge: "bg-yellow-50 text-yellow-800 ring-yellow-300",
    closed: false,
  },
  qualified: {
    label: "Qualified",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    closed: false,
  },
  proposal_sent: {
    label: "Proposal Sent",
    badge: "bg-purple-50 text-purple-700 ring-purple-200",
    closed: false,
  },
  won: {
    label: "Won",
    badge: "bg-gray-100 text-gray-600 ring-gray-200",
    closed: true,
  },
  lost: {
    label: "Lost",
    badge: "bg-red-50 text-red-700 ring-red-200",
    closed: true,
  },
};

export const SEARCH_DEBOUNCE_MS = 250;
