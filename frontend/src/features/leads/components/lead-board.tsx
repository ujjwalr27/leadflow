"use client";

import { Inbox, Pin, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNow } from "@/hooks/use-now";
import { errorMessage } from "@/lib/api-client";

import { SEARCH_DEBOUNCE_MS } from "../constants";
import { useLeadUrlState } from "../hooks/use-lead-url-state";
import { partitionLeads } from "../lib/follow-ups";
import { useLeads } from "../queries";
import type { Lead, LeadFilters } from "../types";
import { LeadListSkeleton } from "./lead-board-skeleton";
import { LeadCard } from "./lead-card";
import { LeadSection } from "./lead-section";
import { SearchInput } from "./search-input";
import { StatusFilter } from "./status-filter";

/** The single LeadFlow screen: filters, search, pinned follow-ups and the lead list. */
export function LeadBoard() {
  const { status, query, setParams } = useLeadUrlState();
  const [searchText, setSearchText] = useState(query);
  const search = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setParams({ q: search || null });
  }, [search, setParams]);

  const filters = useMemo<LeadFilters>(() => ({ status, search }), [status, search]);
  const leadsQuery = useLeads(filters);
  const hasFilters = status !== null || search !== "";

  const clearFilters = () => {
    setSearchText("");
    setParams({ status: null, q: null });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <StatusFilter value={status} onChange={(value) => setParams({ status: value })} />
        <SearchInput
          value={searchText}
          onChange={setSearchText}
          busy={leadsQuery.isFetching && leadsQuery.isPlaceholderData}
        />
      </div>

      {leadsQuery.isPending ? (
        <LeadListSkeleton />
      ) : leadsQuery.isError && !leadsQuery.data ? (
        <ErrorState
          message={errorMessage(leadsQuery.error)}
          onRetry={() => leadsQuery.refetch()}
          retrying={leadsQuery.isFetching}
        />
      ) : leadsQuery.data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No leads match your filters"
            description="Try a different name or status."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Inbox}
            title="No leads yet"
            description="Add your first lead with the “Add New Lead” button above."
          />
        )
      ) : (
        <LeadSections
          leads={leadsQuery.data}
          onOpenLead={(leadId) => setParams({ lead: String(leadId) })}
        />
      )}
    </div>
  );
}

function LeadSections({
  leads,
  onOpenLead,
}: {
  leads: Lead[];
  onOpenLead: (leadId: number) => void;
}) {
  const now = useNow();
  const { pinned, others } = useMemo(() => partitionLeads(leads, now), [leads, now]);

  return (
    <div className="space-y-10">
      {pinned.length > 0 && (
        <LeadSection
          title="Today's Follow-ups"
          count={pinned.length}
          icon={<Pin className="size-3.5 rotate-45 fill-red-500 text-red-500" aria-hidden />}
        >
          {pinned.map((lead) => (
            <LeadCard key={lead.id} lead={lead} now={now} onOpen={onOpenLead} />
          ))}
        </LeadSection>
      )}
      {others.length > 0 && (
        <LeadSection title="All Leads" count={others.length}>
          {others.map((lead) => (
            <LeadCard key={lead.id} lead={lead} now={now} onOpen={onOpenLead} />
          ))}
        </LeadSection>
      )}
    </div>
  );
}
