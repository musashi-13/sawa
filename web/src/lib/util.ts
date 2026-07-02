export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function now(): number {
  return Date.now();
}

/** Local-time `YYYY-MM-DD` for the given timestamp. */
export function dayKey(ts: number = now()): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_MS = 86_400_000;

/** Whole days from now until `deadline`. Negative when overdue. */
export function daysUntil(deadline: number, from: number = now()): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(deadline);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
