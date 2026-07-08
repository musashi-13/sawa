import type { Effort, SawaData, Task } from "../types";
import { now } from "./util";
import { isFailed } from "./ranking";

// ─────────────────────────────────────────────────────────────────────────────
// Queue engine — the "what should I do right now" algorithm. This is the seam
// Karan owns; the UI never sorts tasks itself, it only reads the materialized
// `order` this engine writes.
//
// The order is *derived* from `scoreTask` but *persisted* (see `reindex`): the
// hook recomputes and stores it on discrete events (add / complete / postpone /
// unfold / revive) and once on app-open, so the stack is a stable, synced
// snapshot rather than something that reshuffles live as deadlines tick by.
//
// The scoring is a small, continuous blend of well-known scheduling ideas:
//   • Earliest-Deadline-First, sharpened by effort into Least-Slack-Time.
//   • Multilevel-feedback-queue dynamics: postpone demotes, aging promotes.
//   • WSJF-style quick-win bias (small jobs first) + an Eisenhower importance
//     axis that survives with no deadline.
// Swap the weights freely; nothing else needs to change.
// ─────────────────────────────────────────────────────────────────────────────

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export interface QueueWeights {
  /** How sharply an approaching deadline (or negative slack) raises urgency. */
  deadlinePull: number;
  /** Flat boost the moment a task has zero/negative slack (must-start-now). */
  overdueBoost: number;
  /** Lasting part of the postpone penalty (survives the cooldown). */
  postponeFloor: number;
  /** Decaying part of the postpone penalty (fades over `postponeTauHours`). */
  postponeDecaying: number;
  /** Time constant of the postpone cooldown, in hours. */
  postponeTauHours: number;
  /** Anti-starvation lift per day of age. */
  agingRate: number;
  /** Cap on the aging lift so it never out-shouts a real deadline. */
  agingCap: number;
  /** Bundles sit slightly lower so do-able atomic cards surface first. */
  bundleDemote: number;
  /** Lift for a task flagged important (Eisenhower axis). */
  importantBoost: number;
  /** Assumed hours of work per effort size, for slack. */
  effortHours: Record<Effort, number>;
  /** Quick-win boost per effort size (smaller = more momentum). */
  quickWin: Record<Effort, number>;
}

export const DEFAULT_QUEUE_WEIGHTS: QueueWeights = {
  deadlinePull: 12,
  overdueBoost: 30,
  postponeFloor: 1,
  postponeDecaying: 4,
  postponeTauHours: 8,
  agingRate: 0.4,
  agingCap: 6,
  bundleDemote: 2,
  importantBoost: 8,
  effortHours: { S: 0.25, M: 1, L: 3 },
  quickWin: { S: 3, M: 1, L: 0 },
};

/** Higher score = more urgent = closer to the top of the stack. */
export function scoreTask(
  task: Task,
  w: QueueWeights = DEFAULT_QUEUE_WEIGHTS,
  from: number = now(),
): number {
  let score = 0;
  const effortDays = task.effort ? w.effortHours[task.effort] / 24 : 0;

  // R1 — deadline pull, sharpened by effort into slack (Least-Slack-Time). A
  // 3h task due in 2h is already "overdue" in slack terms even if the clock
  // deadline hasn't passed.
  if (task.deadline !== undefined) {
    const slackDays = (task.deadline - from) / DAY_MS - effortDays;
    if (slackDays <= 0) {
      score += w.overdueBoost + Math.abs(slackDays) * w.deadlinePull;
    } else {
      score += w.deadlinePull / slackDays;
    }
  }

  // Quick-win bias (WSJF ÷ size): small tasks get a nudge, giving momentum
  // especially when nothing has a deadline.
  if (task.effort) score += w.quickWin[task.effort];

  // Importance (Eisenhower) — a lift that doesn't depend on a deadline.
  if (task.important) score += w.importantBoost;

  // Bundles slightly lower: unfold them once the do-able atomic cards thin out.
  if (task.isBundle) score -= w.bundleDemote;

  // R2 — decaying postpone with diminishing returns. `√postpones` keeps the 5th
  // postpone from hurting 5× the 1st; the decaying term means "not now" fades
  // back into view over `postponeTauHours`.
  if (task.postpones > 0) {
    const decay =
      task.postponedAt !== undefined
        ? Math.exp(-((from - task.postponedAt) / HOUR_MS) / w.postponeTauHours)
        : 0; // legacy tasks with no timestamp: only the lasting floor applies
    score -=
      Math.sqrt(task.postpones) * (w.postponeFloor + w.postponeDecaying * decay);
  }

  // R3 — anti-starvation aging: deadline-less tasks slowly rise with age so
  // nothing rots at the bottom forever (capped).
  const ageDays = (from - task.createdAt) / DAY_MS;
  score += Math.min(ageDays * w.agingRate, w.agingCap);

  return score;
}

/** Active = still in play (not completed, not failed). */
function isActive(task: Task, from: number): boolean {
  return task.completedAt === undefined && !isFailed(task, from);
}

/**
 * Recompute the queue snapshot: rank each stream's active tasks and write their
 * position back to `order` (0 = top). Completed/failed tasks get `order`
 * cleared. Returns the same object when nothing changed so callers can skip a
 * needless write. This is the ONLY place `order` is assigned.
 */
export function reindex(
  data: SawaData,
  w: QueueWeights = DEFAULT_QUEUE_WEIGHTS,
  from: number = now(),
): { data: SawaData; changed: boolean } {
  const byStream = new Map<string, Task[]>();
  for (const t of data.tasks) {
    if (!isActive(t, from)) continue;
    const arr = byStream.get(t.streamId);
    if (arr) arr.push(t);
    else byStream.set(t.streamId, [t]);
  }

  const desired = new Map<string, number>();
  for (const arr of byStream.values()) {
    arr.sort(
      (a, b) =>
        scoreTask(b, w, from) - scoreTask(a, w, from) || a.createdAt - b.createdAt,
    );
    arr.forEach((t, i) => desired.set(t.id, i));
  }

  let changed = false;
  const tasks = data.tasks.map((t) => {
    const next = desired.get(t.id); // number for active, undefined otherwise
    if (t.order === next) return t;
    changed = true;
    return { ...t, order: next };
  });

  return changed ? { data: { ...data, tasks }, changed } : { data, changed };
}

/**
 * Sort a stream's active tasks for display. Prefers the materialized `order`
 * (the synced snapshot); falls back to a live score for any task not yet
 * indexed (e.g. the very first render on legacy data).
 */
export function orderedByQueue(tasks: Task[], from: number = now()): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return (
      scoreTask(b, DEFAULT_QUEUE_WEIGHTS, from) -
        scoreTask(a, DEFAULT_QUEUE_WEIGHTS, from) || a.createdAt - b.createdAt
    );
  });
}
