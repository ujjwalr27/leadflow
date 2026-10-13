"use client";

import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs` (default: one minute) so relative times
 * ("5 minutes ago") and follow-up states (today → overdue) stay accurate without a reload.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
