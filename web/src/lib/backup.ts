import type { SawaData } from "../types";

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
 * Parse + shape-check a backup file's text into `SawaData`. Throws a
 * user-readable Error if the file isn't a valid Sawa backup, so the caller can
 * surface the message and never feed a malformed blob into the store (which
 * would break the app or clobber real data).
 */
export function parseBackup(text: string): SawaData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("That file isn't a Sawa backup.");
  }
  const d = parsed as Partial<SawaData>;
  if (
    !Array.isArray(d.tasks) ||
    !Array.isArray(d.streams) ||
    !Array.isArray(d.completionDays)
  ) {
    throw new Error("That file isn't a Sawa backup.");
  }
  // At least one stream must exist or the app has nowhere to show tasks.
  if (d.streams.length === 0) {
    throw new Error("This backup has no streams — it can't be restored.");
  }
  return {
    streams: d.streams,
    tasks: d.tasks,
    completionDays: d.completionDays,
    userName: typeof d.userName === "string" ? d.userName : undefined,
    cardTheme: typeof d.cardTheme === "string" ? d.cardTheme : undefined,
    version: typeof d.version === "number" ? d.version : 1,
  };
}
