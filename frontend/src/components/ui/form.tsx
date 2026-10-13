import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

const CONTROL =
  "block w-full rounded-md border bg-white px-3 text-sm text-gray-900 shadow-xs transition-colors " +
  "placeholder:text-gray-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

const controlState = (invalid?: boolean) =>
  invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20";

interface ControlProps {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & ControlProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, controlState(invalid), "h-9", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: ComponentProps<"textarea"> & ControlProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, controlState(invalid), "min-h-20 resize-y py-2", className)}
      {...props}
    />
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}

/** Label + control + error message, wired together for screen readers. */
export function Field({ id, label, required, optional, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden>
            *
          </span>
        )}
        {optional && <span className="ml-1 font-normal text-gray-400">(Optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
