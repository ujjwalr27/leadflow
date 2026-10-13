"use client";

import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/api-client";

import { STATUS_META } from "../../constants";
import { useUpdateLead } from "../../queries";
import { isLeadStatus, LEAD_STATUSES, type Lead } from "../../types";

/** Native select (accessible, mobile-friendly) that persists the lead's status on change. */
export function StatusSelect({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead(lead.id);

  return (
    <div className="relative">
      <select
        value={lead.status}
        aria-label="Lead status"
        onChange={(event) => {
          const status = event.target.value;
          if (!isLeadStatus(status) || status === lead.status) return;
          updateLead.mutate(
            { status },
            {
              onSuccess: () => toast.success(`Status updated to ${STATUS_META[status].label}`),
              onError: (error) => toast.error(`Couldn't update status: ${errorMessage(error)}`),
            },
          );
        }}
        className="h-9 appearance-none rounded-md border border-gray-300 bg-white pr-8 pl-3 text-sm font-medium text-gray-800 shadow-xs hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-gray-500"
        aria-hidden
      />
    </div>
  );
}
