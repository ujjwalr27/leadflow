import { Search, X } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Shows a spinner while results for the current search are loading. */
  busy?: boolean;
}

export function SearchInput({ value, onChange, busy }: SearchInputProps) {
  return (
    <div className="relative w-full lg:w-64">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search leads by name…"
        aria-label="Search leads by name"
        className="h-9 w-full rounded-md border border-gray-300 bg-white pr-9 pl-9 text-sm shadow-xs placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
        {busy ? (
          <Spinner className="mr-1 text-gray-400" label="Searching" />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label="Clear search"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )
        )}
      </div>
    </div>
  );
}
