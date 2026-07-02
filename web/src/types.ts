// Core domain model.
//
// IDs are UUID strings and every record carries `updatedAt` so that a future
// sync engine (Convex) can reconcile changes. Keep these invariants — the
// local store and any future remote store both depend on them.

export type ID = string;

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
  version: number;
}
