import type { SawaData } from "../types";
import { seedData } from "./seed";
import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// ─────────────────────────────────────────────────────────────────────────────
// Storage seam.
//
// Everything above the UI talks to this `Store` interface, never to
// localStorage directly. `LocalStore` persists to localStorage; `ConvexStore`
// syncs the same blob through Convex (real-time `subscribe`, offline via the
// local cache). The instance is chosen at the bottom of the file — the
// component tree does not change either way.
// ─────────────────────────────────────────────────────────────────────────────

export interface Store {
  load(): SawaData;
  save(data: SawaData): void;
  /** Notifies subscribers of external changes (another tab / another device). */
  subscribe(fn: (data: SawaData) => void): () => void;
}

// Bumped v2 → v3 on the "context" → "stream" rename to reset any old-shape data.
// ConvexStore reuses this key as its offline cache so switching stores is seamless.
const KEY = "sawa.data.v3";

function readCache(): SawaData | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SawaData;
  } catch {
    return null;
  }
}

function writeCache(data: SawaData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

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

// ─────────────────────────────────────────────────────────────────────────────
// ConvexStore — the whole SawaData blob synced through Convex.
//
// `load()` stays synchronous (returns the local cache) so the first render is
// instant and the app works offline. A single reactive subscription to the
// server document fans updates out to listeners → any device's change lands
// everywhere. Writes go to Convex and the cache; on first run (empty server)
// the local seed is pushed up.
// ─────────────────────────────────────────────────────────────────────────────
export class ConvexStore implements Store {
  private client: ConvexClient;
  private cache: SawaData;
  private listeners = new Set<(data: SawaData) => void>();
  private initialized = false;

  constructor(url: string) {
    this.client = new ConvexClient(url);
    this.cache = readCache() ?? seedData();

    this.client.onUpdate(api.data.get, {}, (server) => {
      if (server == null) {
        // Server is empty — seed it once from our local cache.
        if (!this.initialized) {
          this.initialized = true;
          void this.client.mutation(api.data.save, { data: this.cache });
        }
        return;
      }
      this.initialized = true;
      const data = server as SawaData;
      this.cache = data;
      writeCache(data);
      this.listeners.forEach((fn) => fn(data));
    });
  }

  load(): SawaData {
    return this.cache;
  }

  save(data: SawaData): void {
    this.cache = data;
    writeCache(data);
    // Offline: the cache holds and Convex retries the mutation on reconnect.
    void this.client.mutation(api.data.save, { data }).catch(() => {});
  }

  subscribe(fn: (data: SawaData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

// Use Convex when a deployment URL is configured (VITE_CONVEX_URL, injected by
// the Convex/Vercel build); otherwise fall back to local-only storage.
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
export const store: Store = CONVEX_URL
  ? new ConvexStore(CONVEX_URL)
  : new LocalStore();
