import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Compose conditional class names; later Tailwind classes override conflicting earlier ones. */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
