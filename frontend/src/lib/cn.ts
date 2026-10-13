import { clsx, type ClassValue } from "clsx";

/** Compose conditional class names. */
export function cn(...classes: ClassValue[]): string {
  return clsx(classes);
}
