"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { leadsApi } from "./api";
import type {
  Discussion,
  DiscussionCreateInput,
  Lead,
  LeadCreateInput,
  LeadFilters,
  LeadUpdateInput,
} from "./types";

/** Every key starts with "leads" so `invalidateQueries({ queryKey: leadKeys.all })` hits all. */
export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  detail: (leadId: number) => [...leadKeys.all, "detail", leadId] as const,
  discussions: (leadId: number) => [...leadKeys.all, "discussions", leadId] as const,
};

/** Apply `update` to a lead in every cached list and in its detail cache. */
function updateCachedLead(queryClient: QueryClient, leadId: number, update: (lead: Lead) => Lead) {
  queryClient.setQueriesData<Lead[]>({ queryKey: leadKeys.lists() }, (leads) =>
    leads?.map((lead) => (lead.id === leadId ? update(lead) : lead)),
  );
  queryClient.setQueryData<Lead>(leadKeys.detail(leadId), (lead) => lead && update(lead));
}

function findCachedLead(queryClient: QueryClient, leadId: number): Lead | undefined {
  for (const [, leads] of queryClient.getQueriesData<Lead[]>({ queryKey: leadKeys.lists() })) {
    const match = leads?.find((lead) => lead.id === leadId);
    if (match) return match;
  }
  return undefined;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: ({ signal }) => leadsApi.list(filters, signal),
    // Keep showing the previous results while a new filter / search is loading.
    placeholderData: keepPreviousData,
  });
}

export function useLead(leadId: number) {
  const queryClient = useQueryClient();
  return useQuery<Lead>({
    queryKey: leadKeys.detail(leadId),
    queryFn: ({ signal }) => leadsApi.get(leadId, signal),
    // Render the dialog header instantly from the list while the detail loads.
    placeholderData: () => findCachedLead(queryClient, leadId),
  });
}

export function useDiscussions(leadId: number) {
  return useQuery({
    queryKey: leadKeys.discussions(leadId),
    queryFn: ({ signal }) => leadsApi.listDiscussions(leadId, signal),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadCreateInput) => leadsApi.create(input),
    onSuccess: (lead) => {
      queryClient.setQueryData(leadKeys.detail(lead.id), lead);
      return queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/** Optimistically updates the lead everywhere, rolling back if the request fails. */
export function useUpdateLead(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadUpdateInput) => leadsApi.update(leadId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: leadKeys.all });
      const previousLists = queryClient.getQueriesData<Lead[]>({ queryKey: leadKeys.lists() });
      const previousDetail = queryClient.getQueryData<Lead>(leadKeys.detail(leadId));
      updateCachedLead(queryClient, leadId, (lead) => ({ ...lead, ...input }) as Lead);
      return { previousLists, previousDetail };
    },
    onError: (_error, _input, context) => {
      context?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(leadKeys.detail(leadId), context?.previousDetail);
    },
    onSuccess: (lead) => updateCachedLead(queryClient, leadId, () => lead),
    // Status changes add a system entry to the timeline and may move the lead between filters.
    onSettled: () => queryClient.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

/** Writes the server's response straight into the caches so the list updates instantly. */
export function useCreateDiscussion(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DiscussionCreateInput) => leadsApi.createDiscussion(leadId, input),
    onSuccess: ({ discussion, lead }) => {
      updateCachedLead(queryClient, leadId, () => lead);
      queryClient.setQueryData<Discussion[]>(leadKeys.discussions(leadId), (discussions) =>
        discussions ? [discussion, ...discussions] : [discussion],
      );
      return queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}
