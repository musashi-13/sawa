import type { SawaData } from "../types";
import { now, uuid } from "../lib/util";

// First-run state: a clean slate. No sample tasks, no streak, no completions.
// Three empty contexts are kept only as structure (there's no context-creation
// UI yet); everything else starts at zero. All persisted to localStorage.
export function seedData(): SawaData {
  const t = now();
  return {
    version: 1,
    contexts: [
      { id: uuid(), name: "Daily", order: 0, createdAt: t, updatedAt: t },
      { id: uuid(), name: "Projects", order: 1, createdAt: t, updatedAt: t },
      { id: uuid(), name: "Errands", order: 2, createdAt: t, updatedAt: t },
    ],
    completionDays: [],
    tasks: [],
  };
}
