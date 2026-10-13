import { apiRequest } from "@/lib/api-client";

import type {
  Discussion,
  DiscussionCreated,
  DiscussionCreateInput,
  Lead,
  LeadCreateInput,
  LeadFilters,
  LeadUpdateInput,
} from "./types";

export const leadsApi = {
  list: (filters: LeadFilters, signal?: AbortSignal) =>
    apiRequest<Lead[]>("/leads", {
      query: { status: filters.status, search: filters.search.trim() },
      signal,
    }),

  get: (leadId: number, signal?: AbortSignal) => apiRequest<Lead>(`/leads/${leadId}`, { signal }),

  create: (input: LeadCreateInput) => apiRequest<Lead>("/leads", { method: "POST", body: input }),

  update: (leadId: number, input: LeadUpdateInput) =>
    apiRequest<Lead>(`/leads/${leadId}`, { method: "PATCH", body: input }),

  listDiscussions: (leadId: number, signal?: AbortSignal) =>
    apiRequest<Discussion[]>(`/leads/${leadId}/discussions`, { signal }),

  createDiscussion: (leadId: number, input: DiscussionCreateInput) =>
    apiRequest<DiscussionCreated>(`/leads/${leadId}/discussions`, { method: "POST", body: input }),
};
