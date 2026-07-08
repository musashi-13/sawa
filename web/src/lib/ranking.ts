import type { Task } from "../types";
import { daysUntil, now } from "./util";

// ─────────────────────────────────────────────────────────────────────────────
// Failure + urgency helpers.
//
// The "what should I do now" *scoring* lives in `queue.ts` (the seam Karan
// owns). This file keeps only the two derived concerns that aren't about
// ordering: whether a task has failed, and which visual urgency band its
// deadline chip should use.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A task has "failed" once its deadline has passed without completion. Failed
 * tasks leave the active stack and collect in the Failed bin.
 */
export function isFailed(task: Task, from: number = now()): boolean {
  return (
    task.completedAt === undefined &&
    task.deadline !== undefined &&
    task.deadline < from
  );
}

/** Urgency band for visual treatment of the deadline chip. */
export type UrgencyBand = "none" | "calm" | "soon" | "urgent" | "overdue";

export function urgencyBand(task: Task, from: number = now()): UrgencyBand {
  if (task.deadline === undefined) return "none";
  const days = daysUntil(task.deadline, from);
  if (days < 0) return "overdue";
  if (days === 0) return "urgent";
  if (days <= 2) return "soon";
  return "calm";
}
