"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

interface DialogContentProps {
  /** Accessible title; also rendered as the heading unless `header` is supplied. */
  title: string;
  /** Custom header content (replaces the default heading). */
  header?: ReactNode;
  /** Extra controls rendered next to the close button. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DialogContent({ title, header, actions, children, className }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
      <RadixDialog.Content
        aria-describedby={undefined}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
          "rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/5 focus:outline-none",
          "data-[state=open]:animate-[dialog-in_150ms_ease-out]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          {header ? (
            <>
              <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
              <div className="min-w-0 flex-1">{header}</div>
            </>
          ) : (
            <RadixDialog.Title className="text-lg font-semibold text-gray-900">
              {title}
            </RadixDialog.Title>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <RadixDialog.Close
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </RadixDialog.Close>
          </div>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5", className)}>{children}</div>
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
