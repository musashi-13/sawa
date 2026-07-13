import type { SawaData, Task } from "../types";
import { dayKey, now, uuid } from "./util";

// ─────────────────────────────────────────────────────────────────────────────
// Recurrence — daily-repeating tasks, materialized on the client (no server
// cron). A task with `repeat: "daily"` is a *template*: it never appears in the
// stack itself. Each day, `generateDailyInstances` (run on app-open) ensures a
// fresh *instance* exists for today, and quietly retires any past-day instance
// that was never completed — so a daily habit reappears each day without piling
// up in the Failed bin. Completed instances stay (History + streak).
// ─────────────────────────────────────────────────────────────────────────────

/** Build today's instance from a template. Instances carry no deadline: a
 *  skipped one is retired, not failed. */
export function makeInstance(template: Task, day: string, t: number = now()): Task {
  return {
    id: uuid(),
    streamId: template.streamId,
    title: template.title,
    description: template.description,
    isBundle: false,
    effort: template.effort,
    important: template.important,
    templateId: template.id,
    instanceDay: day,
    postpones: 0,
    createdAt: t,
    updatedAt: t,
  };
}

/**
 * Ensure each daily template has an instance for today, and drop past-day
 * instances that were never completed. Returns the same object when nothing
 * changed so callers can skip a needless write.
 */
export function generateDailyInstances(
  data: SawaData,
  from: number = now(),
): { data: SawaData; changed: boolean } {
  const templates = data.tasks.filter((t) => t.repeat === "daily");
  if (templates.length === 0) return { data, changed: false };

  const today = dayKey(from);
  const templateIds = new Set(templates.map((t) => t.id));
  let changed = false;

  // Retire stale, uncompleted instances (past days). Completed ones stay.
  const kept = data.tasks.filter((t) => {
    const stale =
      t.templateId !== undefined &&
      templateIds.has(t.templateId) &&
      t.instanceDay !== undefined &&
      t.instanceDay < today &&
      t.completedAt === undefined;
    if (stale) changed = true;
    return !stale;
  });

  // Ensure today's instance exists for each template.
  const additions: Task[] = [];
  for (const template of templates) {
    const hasToday = kept.some(
      (t) => t.templateId === template.id && t.instanceDay === today,
    );
    if (!hasToday) {
      additions.push(makeInstance(template, today, from));
      changed = true;
    }
  }

  if (!changed) return { data, changed: false };
  return { data: { ...data, tasks: [...kept, ...additions] }, changed: true };
}
