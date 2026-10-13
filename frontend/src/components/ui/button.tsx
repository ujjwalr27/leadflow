import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { Spinner } from "./spinner";

const VARIANTS = {
  primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:outline-blue-600",
  dark: "bg-gray-900 text-white shadow-sm hover:bg-gray-800 focus-visible:outline-gray-900",
  ghost: "text-gray-700 hover:bg-gray-100 focus-visible:outline-gray-400",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-gray-400",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
} as const;

interface ButtonProps extends ComponentProps<"button"> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
