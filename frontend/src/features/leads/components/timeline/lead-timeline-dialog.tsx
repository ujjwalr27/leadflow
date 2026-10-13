"use client";

import { Phone } from "lucide-react";

import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { errorMessage } from "@/lib/api-client";

import { useLead } from "../../queries";
import type { Lead } from "../../types";
import { DiscussionForm } from "./discussion-form";
import { StatusSelect } from "./status-select";
import { Timeline } from "./timeline";

interface LeadTimelineDialogProps {
  leadId: number;
  onClose: () => void;
}

/** Full discussion history for a lead, with status control and a form to log a new note. */
export function LeadTimelineDialog({ leadId, onClose }: LeadTimelineDialogProps) {
  const leadQuery = useLead(leadId);
  const lead = leadQuery.data;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={lead ? `${lead.name} — timeline` : "Lead timeline"}
        header={lead ? <LeadHeader lead={lead} /> : <LeadHeaderSkeleton />}
        actions={lead && <StatusSelect lead={lead} />}
        className="max-w-2xl"
      >
        {leadQuery.isError && !lead ? (
          <DialogBody>
            <ErrorState message={errorMessage(leadQuery.error)} />
          </DialogBody>
        ) : (
          <>
            <DialogBody className="bg-gray-50/70">
              <Timeline leadId={leadId} />
            </DialogBody>
            {lead && <DiscussionForm lead={lead} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LeadHeader({ lead }: { lead: Lead }) {
  return (
    <div className="min-w-0">
      <h2 className="truncate text-lg text-gray-900">
        <span className="font-semibold">{lead.name}</span>
        {lead.company && <span className="ml-1.5 text-gray-500">({lead.company})</span>}
      </h2>
      {lead.phone && (
        <a
          href={`tel:${lead.phone}`}
          className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600"
        >
          <Phone className="size-3.5" aria-hidden />
          {lead.phone}
        </a>
      )}
    </div>
  );
}

function LeadHeaderSkeleton() {
  return (
    <div className="space-y-2 py-1">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
