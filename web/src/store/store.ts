import type { SawaData } from "../types";
import { seedData } from "./seed";

// ─────────────────────────────────────────────────────────────────────────────
// Storage seam.
//
// Everything above the UI talks to this `Store` interface, never to
// localStorage directly. To move to cross-device sync later, implement this
// interface against Convex (a `subscribe` that pushes server updates) and swap
// the instance in `useSawa`. The component tree does not change.
// ─────────────────────────────────────────────────────────────────────────────

export interface Store {
  load(): SawaData;
  save(data: SawaData): void;
  /** Notifies subscribers of external changes (e.g. another tab, future sync). */
  subscribe(fn: (data: SawaData) => void): () => void;
}

const KEY = "sawa.data.v2";

export class LocalStore implements Store {
  private listeners = new Set<(data: SawaData) => void>();

  constructor() {
    // Keep tabs in sync today; mirrors how a sync engine would push updates.
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue) as SawaData;
            this.listeners.forEach((fn) => fn(data));
          } catch {
            /* ignore malformed cross-tab payloads */
          }
        }
      });
    }
  }

  load(): SawaData {
    if (typeof window === "undefined") return seedData();
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const seeded = seedData();
      this.save(seeded);
      return seeded;
    }
    try {
      return JSON.parse(raw) as SawaData;
    } catch {
      const seeded = seedData();
      this.save(seeded);
      return seeded;
    }
  }

  save(data: SawaData): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(data));
  }

  subscribe(fn: (data: SawaData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const store: Store = new LocalStore();
