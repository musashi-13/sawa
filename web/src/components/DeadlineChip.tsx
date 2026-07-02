import { Clock } from "lucide-react";
import type { Task } from "../types";
import { daysUntil } from "../lib/util";
import { urgencyBand } from "../lib/ranking";

const STYLES: Record<string, { bg: string; fg: string }> = {
  calm: { bg: "#E4DCC8", fg: "#7E6A45" },
  soon: { bg: "#EBD6C9", fg: "#9C4A2C" },
  urgent: { bg: "#EBD6C9", fg: "#9C4A2C" },
  overdue: { bg: "#E9C7C0", fg: "#8A2D1C" },
};

function label(task: Task): string {
  const days = daysUntil(task.deadline!);
  if (days < 0) return days === -1 ? "1 day overdue" : `${-days} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function DeadlineChip({ task }: { task: Task }) {
  if (task.deadline === undefined) return null;
  const band = urgencyBand(task);
  const s = STYLES[band] ?? STYLES.calm;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <Clock size={13} />
      {label(task)}
    </span>
  );
}
