// ─────────────────────────────────────────────────────────────────────────────
// Hidden developer mode.
//
// Toggle with Ctrl+Shift+Alt+D (macOS: Control+Option+Shift+D). Three modifiers
// so it can't be triggered by accident, and nothing else claims it — unlike
// Ctrl+Shift+{I,J,C,K} (devtools), +D (bookmark all tabs), +P (private window),
// +N (incognito), +T (reopen tab), +E/M (Firefox devtools panes).
//
// Matched on `event.code`, not `event.key`: on macOS, Option+D reports "∂", so
// a key-based match would silently fail there. `code` is layout-independent.
//
// All it does is surface what the sync layer is doing, in the console: auth
// transitions, hydration, every pushed/held write, and incoming server
// snapshots — plus a `window.__sawa` handle to inspect state and force a push.
// Off by default; the choice persists per device.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "sawa.devmode";

/** Human-readable form, for the toast and the README. */
export const DEV_MODE_SHORTCUT = "Ctrl + Shift + Alt + D";

/** Does this keydown match the developer-mode chord? */
export function isDevModeChord(e: KeyboardEvent): boolean {
  return e.ctrlKey && e.shiftKey && e.altKey && !e.metaKey && e.code === "KeyD";
}

type Listener = (on: boolean) => void;
const listeners = new Set<Listener>();

function read(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
  } catch {
    return false; // private mode / storage disabled
  }
}

let enabled = read();

export function isDevMode(): boolean {
  return enabled;
}

export function setDevMode(on: boolean): void {
  enabled = on;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* non-persistent is fine — the in-memory flag still works this session */
  }
  listeners.forEach((fn) => fn(on));
}

/** Flip developer mode; returns the new state. */
export function toggleDevMode(): boolean {
  setDevMode(!enabled);
  return enabled;
}

export function onDevModeChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Console log that only appears in developer mode. */
export function devLog(event: string, detail?: unknown): void {
  if (!enabled) return;
  const tag = "%c[sawa]%c " + event;
  const badge = "color:#C96442;font-weight:600";
  if (detail !== undefined) console.log(tag, badge, "color:inherit", detail);
  else console.log(tag, badge, "color:inherit");
}
