import { CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <Icon className="size-8 text-gray-300" aria-hidden />
      <p className="mt-3 font-medium text-gray-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({ message, onRetry, retrying }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <CircleAlert className="size-8 text-red-400" aria-hidden />
      <p className="mt-3 font-medium text-red-800">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} loading={retrying}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-200", className)} aria-hidden />;
}
