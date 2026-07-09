// ─────────────────────────────────────────────────────────────────────────────
// Keymap — the single source of truth for keyboard shortcuts.
//
// Why a typed module (not hardcoded in components, not a JSON file):
//   • The DEFAULTS are static data the app ships with, so a typed `.ts` const
//     gives compile-time safety (ActionId is a closed union — a typo won't
//     silently fail) and zero parsing cost.
//   • Components resolve keys -> actions through `resolveAction`, so rebinding a
//     shortcut means editing one line here, and the help sheet stays in sync
//     automatically.
//   • When we add USER-customisable shortcuts later, persist only the user's
//     overrides as JSON in the Store (localStorage now, Convex later) and merge
//     them over these defaults at runtime. JSON is the right format for
//     serialised user data; TS is the right format for the built-in defaults.
// ─────────────────────────────────────────────────────────────────────────────

export type ActionId =
  | "complete"
  | "postpone"
  | "delete"
  | "prevStream"
  | "nextStream"
  | "moveStreamEarlier"
  | "moveStreamLater"
  | "addTask"
  | "makeBundle"
  | "addItem"
  | "undo"
  | "toggleHelp"
  | "close";

export interface KeyBinding {
  action: ActionId;
  /** `KeyboardEvent.key` values that trigger this action. Empty = no global key. */
  keys: string[];
  /** How the binding is shown in the help sheet. */
  display: string;
  help: string;
}

export const DEFAULT_KEYMAP: KeyBinding[] = [
  {
    action: "complete",
    keys: ["d", "D", "ArrowRight"],
    display: "D  or  →",
    help: "Complete · unfold a bundle · revive (in Failed)",
  },
  {
    action: "postpone",
    keys: ["a", "A", "ArrowLeft"],
    display: "A  or  ←",
    help: "Postpone to the back · discard (in Failed)",
  },
  {
    action: "delete",
    keys: ["x", "X", "Delete", "Backspace"],
    display: "⌫  or  X",
    help: "Delete top card",
  },
  { action: "prevStream", keys: ["q"], display: "Q", help: "Previous stream" },
  { action: "nextStream", keys: ["e"], display: "E", help: "Next stream" },
  {
    action: "moveStreamEarlier",
    keys: ["Q"],
    display: "⇧Q",
    help: "Move stream earlier",
  },
  {
    action: "moveStreamLater",
    keys: ["E"],
    display: "⇧E",
    help: "Move stream later",
  },
  { action: "addTask", keys: [" "], display: "Space", help: "Open the add pane" },
  {
    action: "makeBundle",
    keys: [],
    display: "Tab → ↵",
    help: "In the pane: make it a bundle",
  },
  { action: "addItem", keys: [], display: "↵", help: "Add the item" },
  // Handled directly in App (needs a modifier, which resolveAction doesn't map).
  { action: "undo", keys: [], display: "⌘Z / Ctrl+Z", help: "Undo the last swipe" },
  { action: "toggleHelp", keys: ["?"], display: "?", help: "Toggle this help" },
  { action: "close", keys: ["Escape"], display: "Esc", help: "Close" },
];

function buildLookup(keymap: KeyBinding[]): Record<string, ActionId> {
  const map: Record<string, ActionId> = {};
  for (const binding of keymap) {
    for (const key of binding.keys) map[key] = binding.action;
  }
  return map;
}

const LOOKUP = buildLookup(DEFAULT_KEYMAP);

/** Resolve a keyboard event to an action, or null if unbound. */
export function resolveAction(e: KeyboardEvent): ActionId | null {
  return LOOKUP[e.key] ?? null;
}
