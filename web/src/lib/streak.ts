import type { CompletionDay } from "../types";
import { dayKey } from "./util";

const DAY_MS = 86_400_000;

function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d).getTime() - DAY_MS);
}

/**
 * Current streak = consecutive days with >=1 completion, counting back from
 * today (or yesterday, so the streak doesn't break before today's first
 * completion).
 */
export function currentStreak(
  days: CompletionDay[],
  today: string = dayKey(),
): number {
  if (days.length === 0) return 0;
  const set = new Set(days);

  let cursor = set.has(today) ? today : prevDay(today);
  // If neither today nor yesterday has a completion, streak is 0.
  if (!set.has(cursor)) return 0;

  let count = 0;
  while (set.has(cursor)) {
    count++;
    cursor = prevDay(cursor);
  }
  return count;
}
