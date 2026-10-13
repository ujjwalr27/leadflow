import { Skeleton } from "@/components/ui/states";

export function LeadListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading leads">
      <Skeleton className="mb-4 h-3 w-28" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Fallback for the whole board while URL state is resolved on the client. */
export function LeadBoardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <LeadListSkeleton />
    </div>
  );
}
