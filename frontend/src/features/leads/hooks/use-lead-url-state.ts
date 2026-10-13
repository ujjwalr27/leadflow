"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { isLeadStatus, type LeadStatus } from "../types";

type ParamName = "status" | "q" | "lead";

function parseLeadId(value: string | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Board state that lives in the URL, so filters survive a refresh and links are shareable:
 * `?status=qualified&q=sarah&lead=12` (`lead` deep-links to an open timeline dialog).
 */
export function useLeadUrlState() {
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("status");

  const status: LeadStatus | null = isLeadStatus(rawStatus) ? rawStatus : null;
  const query = searchParams.get("q") ?? "";
  const leadId = parseLeadId(searchParams.get("lead"));

  /** Update params in place; `null` / empty removes a param. Uses `replaceState` (no reload). */
  const setParams = useCallback((updates: Partial<Record<ParamName, string | null>>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [name, value] of Object.entries(updates)) {
      if (value) params.set(name, value);
      else params.delete(name);
    }
    const queryString = params.toString();
    if (queryString !== window.location.search.replace(/^\?/, "")) {
      window.history.replaceState(null, "", queryString ? `?${queryString}` : location.pathname);
    }
  }, []);

  return { status, query, leadId, setParams };
}
