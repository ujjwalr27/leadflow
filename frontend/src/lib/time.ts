import { addDays, differenceInSeconds, format, formatDistanceStrict, isSameDay } from "date-fns";

/** "just now", "5 minutes ago", "2 days ago", "in 3 hours". */
export function formatRelative(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Math.abs(differenceInSeconds(date, now)) < 60) return "just now";
  return formatDistanceStrict(date, now, { addSuffix: true, roundingMethod: "floor" });
}

/** "May 4, 10:30 AM" (adds the year when it differs from the current one). */
export function formatDateTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const pattern =
    date.getFullYear() === now.getFullYear() ? "MMM d, h:mm a" : "MMM d, yyyy, h:mm a";
  return format(date, pattern);
}

/** "2:00 PM" */
export function formatTime(iso: string): string {
  return format(new Date(iso), "h:mm a");
}

/** "today at 2:00 PM", "tomorrow at 9:00 AM", "Fri, Oct 16 at 9:00 AM". */
export function formatDayAndTime(iso: string, now: Date): string {
  const date = new Date(iso);
  if (isSameDay(date, now)) return `today at ${formatTime(iso)}`;
  if (isSameDay(date, addDays(now, 1))) return `tomorrow at ${formatTime(iso)}`;
  return format(date, "EEE, MMM d 'at' h:mm a");
}

/** `yyyy-MM-dd` for `<input type="date">` in local time. */
export function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Combine local `<input type="date">` and `<input type="time">` values into a UTC ISO string.
 * Returns `null` if either part is missing or invalid.
 */
export function localInputsToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const local = new Date(`${date}T${time}`);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}
