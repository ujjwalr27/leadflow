import { cn } from "@/lib/cn";

import { STATUS_META } from "../constants";
import { LEAD_STATUSES, type LeadStatus } from "../types";

interface StatusFilterProps {
  value: LeadStatus | null;
  onChange: (status: LeadStatus | null) => void;
}

const OPTIONS: { value: LeadStatus | null; label: string }[] = [
  { value: null, label: "All" },
  ...LEAD_STATUSES.map((status) => ({ value: status, label: STATUS_META[status].label })),
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="status-filter">
      <span
        id="status-filter"
        className="mr-2 text-xs font-semibold tracking-wider text-gray-500 uppercase"
      >
        Filters:
      </span>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 rounded-full border px-3.5 text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              active
                ? "border-gray-900 bg-gray-900 font-medium text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
