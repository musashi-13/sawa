import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { Task, TaskStream } from "../types";
import { isFailed } from "../lib/ranking";
import { dayKey, now } from "../lib/util";

// ─────────────────────────────────────────────────────────────────────────────
// History — a read-only log of finished tasks (completed + missed) across every
// stream. No new data: completed tasks keep their record in the blob and missed
// ones are derived via `isFailed`. Two sorts — by when it happened (completed /
// missed date) or by when it was created — each list sectioned by day.
// ─────────────────────────────────────────────────────────────────────────────

type SortMode = "completed" | "created";

interface HistoryEntry {
  task: Task;
  status: "done" | "missed";
  /** completedAt for done, deadline (the miss moment) for missed. */
  when: number;
}

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  streams: TaskStream[];
}

function sectionLabel(key: string): string {
  const today = dayKey();
  const yesterday = dayKey(Date.now() - 86_400_000);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  const sameYear = y === new Date().getFullYear();
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HistoryModal({ open, onClose, tasks, streams }: HistoryModalProps) {
  const [sort, setSort] = useState<SortMode>("completed");

  const streamName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of streams) m.set(s.id, s.name);
    return m;
  }, [streams]);

  // Group entries into day sections, ordered most-recent-first.
  const sections = useMemo(() => {
    const t0 = now();
    const entries: HistoryEntry[] = [];
    for (const task of tasks) {
      if (task.completedAt !== undefined) {
        entries.push({ task, status: "done", when: task.completedAt });
      } else if (isFailed(task, t0) && task.deadline !== undefined) {
        entries.push({ task, status: "missed", when: task.deadline });
      }
    }
    const keyOf = (e: HistoryEntry) =>
      sort === "completed" ? e.when : e.task.createdAt;
    entries.sort((a, b) => keyOf(b) - keyOf(a));

    const out: { key: string; label: string; entries: HistoryEntry[] }[] = [];
    for (const e of entries) {
      const key = dayKey(keyOf(e));
      const last = out[out.length - 1];
      if (last && last.key === key) last.entries.push(e);
      else out.push({ key, label: sectionLabel(key), entries: [e] });
    }
    return out;
  }, [tasks, sort]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ background: "rgba(10,9,8,0.6)" }}
        >
          <motion.div
            className="border-border-warm flex max-h-[80vh] w-full max-w-[420px] flex-col rounded-t-3xl border bg-[#211e1b] p-5 sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-cream font-serif text-[18px] font-medium">History</h2>
              <button onClick={onClose} aria-label="Close" className="text-muted">
                <X size={20} />
              </button>
            </div>

            {/* Sort toggle */}
            <div className="border-border-warm mb-4 flex rounded-full border p-0.5">
              {(["completed", "created"] as SortMode[]).map((m) => {
                const on = sort === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSort(m)}
                    className="flex-1 rounded-full py-1.5 text-[12px] font-medium transition-colors"
                    style={{
                      background: on ? "#2c2a22" : "transparent",
                      color: on ? "#d9b877" : "#8C8270",
                    }}
                  >
                    {m === "completed" ? "By date done" : "By date created"}
                  </button>
                );
              })}
            </div>

            {/* Timeline */}
            <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
              {sections.length === 0 ? (
                <p className="text-muted-soft py-10 text-center text-[13px]">
                  No history yet. Finished and missed tasks land here.
                </p>
              ) : (
                sections.map((section) => (
                  <div key={section.key} className="mb-4 last:mb-0">
                    <div className="text-muted-soft mb-2 text-[11px] font-medium uppercase tracking-[1px]">
                      {section.label}
                    </div>
                    <div className="space-y-1.5">
                      {section.entries.map((e) => (
                        <HistoryRow
                          key={e.task.id}
                          entry={e}
                          stream={streamName.get(e.task.streamId)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HistoryRow({ entry, stream }: { entry: HistoryEntry; stream?: string }) {
  const done = entry.status === "done";
  return (
    <div className="border-border-warm flex items-center gap-3 rounded-xl border bg-bg px-3 py-2.5">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{
          background: done ? "rgba(44,110,79,0.18)" : "rgba(192,88,74,0.16)",
          color: done ? "#5F9E7C" : "#C0584A",
        }}
        aria-label={done ? "Completed" : "Missed"}
      >
        {done ? <Check size={14} /> : <X size={14} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-cream-soft truncate text-[14px]">{entry.task.title}</div>
        <div className="text-muted-soft mt-0.5 flex items-center gap-1.5 text-[11px]">
          {stream && <span className="truncate">{stream}</span>}
          {stream && <span className="opacity-40">·</span>}
          <span>{done ? "done" : "missed"} {timeLabel(entry.when)}</span>
        </div>
      </div>
    </div>
  );
}
