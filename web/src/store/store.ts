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

/** Fetches a fresh auth token (Clerk). Returns null when signed out. */
export type TokenFetcher = (args: {
  forceRefreshToken: boolean;
}) => Promise<string | null>;

export interface Store {
  load(): SawaData;
  save(data: SawaData): void;
  /** Notifies subscribers of external changes (another tab / another device). */
  subscribe(fn: (data: SawaData) => void): () => void;
  /** Wire (or clear, with null) the auth token source. No-op for local storage. */
  setAuth?(getToken: TokenFetcher | null): void;
  /** Clear local state immediately on sign-out click, before the page reloads. */
  signOutReset?(): void;
}

// Bumped v2 → v3 on the "context" → "stream" rename to reset any old-shape data.
// ConvexStore reuses this key as its offline cache so switching stores is seamless.
const KEY = "sawa.data.v3";
// "1" while a user is signed in. Persisted (not just in-memory) so a sign-out
// that reloads the page is still recognised on the next load.
const SESSION_KEY = "sawa.session";

function readSession(): boolean {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem(SESSION_KEY) === "1"
  );
}
function setSession(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) window.localStorage.setItem(SESSION_KEY, "1");
  else window.localStorage.removeItem(SESSION_KEY);
}

const DEFAULT_STREAM_NAMES = ["Daily", "Projects", "Errands"];

/** Does this blob hold anything worth migrating up to a fresh account? Guards
 *  the seed path so an empty / just-reset cache never claims (and clobbers) an
 *  account — a bare seed (3 default streams, no tasks/name) counts as empty. */
function hasContent(d: SawaData): boolean {
  return (
    d.tasks.length > 0 ||
    d.completionDays.length > 0 ||
    !!d.userName ||
    d.streams.length !== 3 ||
    d.streams.some((s) => !DEFAULT_STREAM_NAMES.includes(s.name))
  );
}

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
  private authed = false;
  private seeded = false;
  private hydrateTimer: ReturnType<typeof setTimeout> | null = null;
  // Flips true on the first server snapshot after auth is wired. Until then we
  // must NOT push local writes: a save issued in the gap between sign-in and the
  // account loading (e.g. auto-filling the display name while the cache is still
  // the post-sign-out empty seed) would overwrite real server data before it
  // arrives — the sign-out/sign-in data-wipe. Gating pushes on this closes it.
  private hydrated = false;

  constructor(url: string) {
    this.client = new ConvexClient(url);
    this.cache = readCache() ?? seedData();

    this.client.onUpdate(api.data.get, {}, (server) => {
      // We've now heard from the server for this auth session — writes are safe.
      this.markHydrated();
      if (server == null) {
        // No server data yet. Migrate the local cache up to seed the account —
        // but ONLY if it actually holds something. An empty/just-reset cache must
        // never seed the server: otherwise a signed-out-then-in device (or a
        // second empty device) could overwrite real data that another device is
        // about to sync. When the cache is empty we leave the account untouched;
        // the first real write (`save`) creates it.
        if (this.authed && !this.seeded && hasContent(this.cache)) {
          this.seeded = true;
          void this.client.mutation(api.data.save, { data: this.cache }).catch(
            () => {},
          );
        }
        return;
      }
      this.seeded = true;
      const data = server as SawaData;
      this.cache = data;
      writeCache(data);
      this.listeners.forEach((fn) => fn(data));
    });
  }

  /** Start the write gate for a genuine sign-in, with a safety valve. The
   *  subscription only re-fires when the query *result* changes, so an account
   *  whose state doesn't change (e.g. a brand-new, still-empty one) could leave
   *  us waiting forever — and a blocked write is a silently lost edit. Never
   *  gate longer than this: losing the user's work is far worse than the narrow
   *  race the gate exists to prevent. */
  private beginHydration(): void {
    this.hydrated = false;
    if (this.hydrateTimer !== null) clearTimeout(this.hydrateTimer);
    this.hydrateTimer = setTimeout(() => {
      this.hydrated = true;
      this.hydrateTimer = null;
    }, 8000);
  }

  /** The account's data has arrived — writes may flow. */
  private markHydrated(): void {
    this.hydrated = true;
    if (this.hydrateTimer !== null) {
      clearTimeout(this.hydrateTimer);
      this.hydrateTimer = null;
    }
  }

  /** Sign-out: close the gate and drop any pending safety valve. */
  private cancelHydration(): void {
    this.hydrated = false;
    if (this.hydrateTimer !== null) {
      clearTimeout(this.hydrateTimer);
      this.hydrateTimer = null;
    }
  }

  /** Wipe local state back to a clean default and push it to the UI + cache.
   *  The account's data lives safely on the server; we just stop showing it. */
  private resetToDefault(): void {
    const fresh = seedData();
    this.cache = fresh;
    writeCache(fresh);
    this.listeners.forEach((fn) => fn(fresh));
  }

  /**
   * Called synchronously the instant the user clicks "Sign out", before Clerk
   * tears down the session and reloads the page. Clearing the cache (and Convex
   * auth) here means the reload reads the already-cleared state, so the
   * signed-in cards/streams don't render for a frame and then vanish — the
   * sign-out flash. `setAuth(null)` still runs afterwards as a safety net for
   * sign-outs that don't originate from the button (e.g. session expiry).
   */
  signOutReset(): void {
    setSession(false);
    this.authed = false;
    this.seeded = false;
    this.cancelHydration();
    this.client.setAuth(async () => null);
    this.resetToDefault();
  }

  /** Bridge the auth token in from Clerk (or clear it on sign-out). */
  setAuth(getToken: TokenFetcher | null): void {
    if (!getToken) {
      // A real sign-out is "was signed in (session marker set) → now not". Reset
      // the local cache to a clean default. A plain guest load (no prior session)
      // leaves local data untouched. This also runs on the load after sign-out,
      // so the reset survives Clerk's post-sign-out reload even if the eager
      // signOutReset (on the button) didn't run.
      const signedOut = readSession();
      this.authed = false;
      this.seeded = false;
      this.cancelHydration();
      this.client.setAuth(async () => null);
      if (signedOut) {
        setSession(false);
        this.resetToDefault();
      }
      return;
    }
    // Gate writes ONLY on a genuine sign-in. Clerk re-wires its token
    // periodically (refresh), which calls this again for the *same* session —
    // resetting the gate there would block every later write, and because the
    // subscription only re-fires on a changed result, it could stay blocked
    // forever. Those unsent edits then get wiped by the next server snapshot,
    // which is exactly how a device's new tasks/streams vanished.
    const wasAuthed = this.authed;
    setSession(true);
    this.authed = true;
    if (!wasAuthed) {
      this.seeded = false; // allow seeding the (possibly brand-new) account
      this.beginHydration(); // block writes until this account's data has loaded
    }
    this.client.setAuth(getToken);
  }

  load(): SawaData {
    return this.cache;
  }

  save(data: SawaData): void {
    this.cache = data;
    writeCache(data);
    // Don't push until this account's data has loaded at least once (see
    // `hydrated`): a write in the sign-in → load gap would clobber the server
    // with the just-reset empty cache. The write still lands in the local cache;
    // once the account loads, the server snapshot wins (restore), or — for a
    // brand-new/empty account — the onUpdate seed branch flushes the cache up.
    if (!this.authed || !this.hydrated) {
      // Visible on purpose: a dropped write is a lost edit, and swallowing it
      // silently is what made this class of bug so hard to see.
      if (this.authed) console.warn("[sawa] write held: account still loading");
      return;
    }
    // Offline: the cache holds and Convex retries the mutation on reconnect.
    void this.client
      .mutation(api.data.save, { data })
      .catch((err) => console.warn("[sawa] sync failed", err));
  }

  subscribe(fn: (data: SawaData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

// Use Convex only when BOTH a deployment URL and Clerk are configured — the
// Convex functions require auth, so Convex without Clerk can't sync. Otherwise
// fall back to local-only storage (safe during rollout / for guest builds).
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
export const store: Store =
  CONVEX_URL && CLERK_KEY ? new ConvexStore(CONVEX_URL) : new LocalStore();
