"use client";

import { useSearchParams } from "next/navigation";

import { isLeadStatus } from "../types";

type ParamName = "status" | "q" | "lead";

function parseLeadId(value: string | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Update board params in the URL without a reload; `null` / empty removes a param.
 * Next.js syncs `replaceState` with `useSearchParams`, so every reader re-renders.
 */
export function setLeadUrlParams(updates: Partial<Record<ParamName, string | null>>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [name, value] of Object.entries(updates)) {
    if (value) params.set(name, value);
    else params.delete(name);
  }
  const queryString = params.toString();
  if (queryString !== window.location.search.replace(/^\?/, "")) {
    window.history.replaceState(null, "", queryString ? `?${queryString}` : location.pathname);
  }
}

/**
 * Board state that lives in the URL, so filters survive a refresh and links are shareable:
 * `?status=qualified&q=sarah&lead=12` (`lead` deep-links to an open timeline dialog).
 */
export function useLeadUrlState() {
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("status");

  return {
    status: isLeadStatus(rawStatus) ? rawStatus : null,
    query: searchParams.get("q") ?? "",
    leadId: parseLeadId(searchParams.get("lead")),
    setParams: setLeadUrlParams,
  };
}
