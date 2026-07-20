import type { Effort, SawaData, Task, TaskStream } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Manual backup: export the whole SawaData blob to a JSON file the user keeps,
// and import it back later. A user-owned safety net that doesn't depend on the
// server (or on being signed in) — handy across the sync rollout and for moving
// data between accounts.
// ─────────────────────────────────────────────────────────────────────────────

/** `sawa-backup-2026-07-19.json` — a stable, sortable, human-readable name. */
export function backupFilename(at: number = Date.now()): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `sawa-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}.json`;
}

/** Trigger a client-side download of the data blob as pretty-printed JSON. */
export function downloadBackup(data: SawaData, at: number = Date.now()): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename(at);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the click has fully initiated the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Parse + fully validate a backup file's text into `SawaData`. Throws a
 * user-readable Error if the file isn't a valid Sawa backup, so the caller can
 * surface the message and never feed a malformed blob into the store (which
 * would break the app or clobber real data).
 *
 * Every stream and task is *reconstructed* field-by-field with type checks — we
 * never pass the raw parsed objects straight through — so junk records (wrong
 * types, missing ids, stray fields) can't slip into the store. Records that
 * lack their required identity fields (a stream/task id, a task's stream +
 * title) reject the whole file rather than importing a corrupt subset.
 */
const CORRUPT = "This file looks corrupted — it isn't a usable Sawa backup.";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function toStream(raw: unknown, i: number, at: number): TaskStream {
  if (!isObj(raw) || !str(raw.id)) throw new Error(CORRUPT);
  return {
    id: raw.id as string,
    name: str(raw.name) || "Stream",
    order: num(raw.order) ?? i,
    createdAt: num(raw.createdAt) ?? at,
    updatedAt: num(raw.updatedAt) ?? at,
  };
}

function toTask(raw: unknown, at: number): Task {
  // A task must at least know who it is, where it lives, and what it says.
  if (!isObj(raw) || !str(raw.id) || !str(raw.streamId) || !str(raw.title)) {
    throw new Error(CORRUPT);
  }
  const effort = str(raw.effort);
  const repeat = raw.repeat === "daily" ? "daily" : undefined;
  return {
    id: raw.id as string,
    streamId: raw.streamId as string,
    title: raw.title as string,
    description: str(raw.description),
    deadline: num(raw.deadline),
    isBundle: raw.isBundle === true,
    childTitles: Array.isArray(raw.childTitles)
      ? raw.childTitles.filter((c): c is string => typeof c === "string")
      : undefined,
    parentTitle: str(raw.parentTitle),
    effort: (["S", "M", "L"].includes(effort ?? "") ? effort : undefined) as
      | Effort
      | undefined,
    important: raw.important === true || undefined,
    postponedAt: num(raw.postponedAt),
    order: num(raw.order),
    repeat,
    templateId: str(raw.templateId),
    instanceDay: str(raw.instanceDay),
    postpones: num(raw.postpones) ?? 0,
    completedAt: num(raw.completedAt),
    createdAt: num(raw.createdAt) ?? at,
    updatedAt: num(raw.updatedAt) ?? at,
  };
}

export function parseBackup(text: string): SawaData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isObj(parsed)) {
    throw new Error("That file isn't a Sawa backup.");
  }
  if (
    !Array.isArray(parsed.tasks) ||
    !Array.isArray(parsed.streams) ||
    !Array.isArray(parsed.completionDays)
  ) {
    throw new Error("That file isn't a Sawa backup.");
  }
  const at = Date.now();
  const streams = parsed.streams.map((s, i) => toStream(s, i, at));
  // At least one stream must exist or the app has nowhere to show tasks.
  if (streams.length === 0) {
    throw new Error("This backup has no streams — it can't be restored.");
  }
  const tasks = parsed.tasks.map((t) => toTask(t, at));
  return {
    streams,
    tasks,
    completionDays: parsed.completionDays.filter(
      (d): d is string => typeof d === "string",
    ),
    userName: str(parsed.userName),
    cardTheme: str(parsed.cardTheme),
    version: num(parsed.version) ?? 1,
  };
}
