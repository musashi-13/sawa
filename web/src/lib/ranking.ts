import type { Task } from "../types";
import { daysUntil, now } from "./util";

// ─────────────────────────────────────────────────────────────────────────────
// Ranking — the "what should I do right now" algorithm.
//
// This is the seam Karan owns. The contract: given the active (incomplete)
// tasks for a stream, return them ordered so index 0 is the strongest
// recommendation (top of the stack). There is intentionally NO fixed ordering
// imposed by the user — order emerges purely from urgency + postpones, so the
// stack always surfaces something doable now.
//
// Swap the body of `scoreTask` freely; the UI only depends on `rankTasks`.
// ─────────────────────────────────────────────────────────────────────────────

export interface RankWeights {
  /** How sharply an approaching deadline raises urgency. */
  deadlinePull: number;
  /** How much each postpone pushes a card toward the back. */
  postponePenalty: number;
  /** Extra boost once a task is overdue. */
  overdueBoost: number;
}

export const DEFAULT_WEIGHTS: RankWeights = {
  deadlinePull: 12,
  postponePenalty: 4,
  overdueBoost: 30,
};

/** Higher score = more urgent = closer to the top of the stack. */
export function scoreTask(
  task: Task,
  weights: RankWeights = DEFAULT_WEIGHTS,
  from: number = now(),
): number {
  let score = 0;

  if (task.deadline !== undefined) {
    const days = daysUntil(task.deadline, from);
    if (days <= 0) {
      // Overdue: large, still-growing urgency.
      score += weights.overdueBoost + Math.abs(days) * weights.deadlinePull;
    } else {
      // Closer deadline -> higher score, decaying with distance.
      score += weights.deadlinePull / days;
    }
  }

  // Bundles nudge slightly upward so they get unfolded rather than buried.
  if (task.isBundle) score += 1;

  // Postpones reduce urgency without hard-ordering anything.
  score -= task.postpones * weights.postponePenalty;

  return score;
}

export function rankTasks(
  tasks: Task[],
  weights: RankWeights = DEFAULT_WEIGHTS,
  from: number = now(),
): Task[] {
  return [...tasks].sort((a, b) => {
    const diff = scoreTask(b, weights, from) - scoreTask(a, weights, from);
    if (diff !== 0) return diff;
    // Stable tiebreak: older tasks first.
    return a.createdAt - b.createdAt;
  });
}

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
