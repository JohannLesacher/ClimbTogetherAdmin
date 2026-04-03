import type { Timestamp } from "firebase-admin/firestore";

/**
 * Converts any Firestore timestamp variant to milliseconds.
 * Handles: Admin SDK Timestamp, plain { seconds, nanoseconds }, Date, or number.
 */
export function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  // Admin SDK Timestamp has toMillis()
  if (typeof (value as Timestamp).toMillis === "function") {
    return (value as Timestamp).toMillis();
  }
  // Plain object { seconds, nanoseconds }
  if (
    typeof value === "object" &&
    "seconds" in (value as object) &&
    typeof (value as { seconds: number }).seconds === "number"
  ) {
    return (value as { seconds: number }).seconds * 1000;
  }
  return 0;
}

export function formatDate(ms: number): string {
  if (!ms) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}
