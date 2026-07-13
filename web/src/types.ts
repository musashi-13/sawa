// Core domain model.
//
// IDs are UUID strings and every record carries `updatedAt` so that a future
// sync engine (Convex) can reconcile changes. Keep these invariants — the
// local store and any future remote store both depend on them.

export type ID = string;

/** Rough size/effort of a task: Small, Medium, Large. Drives slack- and
 *  quick-win-based ranking in the queue engine. */
export type Effort = "S" | "M" | "L";

export interface TaskStream {
  id: ID;
  name: string;
  /** Display order of the stream in the bottom switcher. */
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: ID;
  streamId: ID;
  title: string;

  /** Optional short description shown under the title on the card. */
  description?: string;

  /**
   * Optional deadline as epoch ms. Drives urgency + ranking. When a deadline
   * passes without completion the task is considered "failed" (see
   * `isFailed`): it leaves the active stack and lands in the Failed bin, from
   * which it can be revived (which clears the deadline).
   */
  deadline?: number;

  /**
   * A bundle is a parent task that, when swiped right, unfolds its children
   * into the stack instead of completing. `childTitles` holds the sub-tasks
   * to spawn. A normal task has `isBundle: false` and no `childTitles`.
   */
  isBundle: boolean;
  childTitles?: string[];

  /** Set on tasks that were spawned from a bundle, for the breadcrumb. */
  parentTitle?: string;

  /** Optional effort/size estimate. Enables Least-Slack-Time urgency near a
   *  deadline and a quick-win bias when there is none. */
  effort?: Effort;

  /** User-flagged importance (an Eisenhower-style axis), independent of any
   *  deadline, so important-but-not-urgent tasks don't sink out of view. */
  important?: boolean;

  /** Epoch ms of the most recent postpone. Drives the *decaying* postpone
   *  penalty — the suppression wears off over time so "not now" isn't "never". */
  postponedAt?: number;

  /**
   * Materialized queue position within its stream (0 = top of the stack).
   * Recomputed by the queue engine on discrete events + app-open and synced via
   * `updatedAt`, so every device shows the same stack. It is *derived* from the
   * scoring function, but persisted to freeze the snapshot between events (the
   * stack shouldn't reshuffle under your finger as time passes).
   */
  order?: number;

  /**
   * Recurrence marker on a *template* task. A template is never shown in the
   * stack, counted, ranked, or logged — it just spawns a fresh instance each
   * day (see `lib/recurrence.ts`). Only "daily" for now.
   */
  repeat?: "daily";

  /** On an *instance*: the id of the recurring template it was spawned from. */
  templateId?: ID;

  /**
   * On an instance: the day (local `YYYY-MM-DD`) it belongs to. Used to dedupe
   * generation (one instance per template per day) and to retire stale,
   * uncompleted instances when a new day's copy is created.
   */
  instanceDay?: string;

  /**
   * Soft signal used by the ranking algorithm. Each postpone increments this,
   * pushing the card toward the back of the stack without imposing a hard
   * order between tasks.
   */
  postpones: number;

  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** A day on which at least one task was completed, as `YYYY-MM-DD`. */
export type CompletionDay = string;

export interface SawaData {
  streams: TaskStream[];
  tasks: Task[];
  /** Sorted ascending list of days with >=1 completion, for streaks. */
  completionDays: CompletionDay[];
  /**
   * The user's preferred display name, captured by a first-run prompt when
   * absent. Stored here (not a stray localStorage key) so it rides the same
   * persistence + future sync path as the rest of the data.
   */
  userName?: string;
  /** Id of the selected card theme (see `lib/cardThemes.ts`). Global for now;
   *  per-stream themes can layer on later. */
  cardTheme?: string;
  version: number;
}
