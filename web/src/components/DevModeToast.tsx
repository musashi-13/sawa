import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Terminal } from "lucide-react";
import { DEV_MODE_SHORTCUT, isDevMode, onDevModeChange } from "../lib/devMode";

// Transient confirmation for the hidden developer-mode chord, so toggling it
// (on *and* off) is never silent. Deliberately plain — this is a tool, not a
// feature; it shouldn't read as part of the product surface.
const DISMISS_MS = 3200;

export function DevModeToast() {
  const [note, setNote] = useState<{ on: boolean; at: number } | null>(null);

  // Only react to *changes*, so the toast never appears on a plain page load
  // even when developer mode is already on from a previous session.
  useEffect(() => onDevModeChange((on) => setNote({ on, at: Date.now() })), []);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), DISMISS_MS);
    return () => clearTimeout(id);
  }, [note]);

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-5 z-[60] flex justify-center px-4"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        >
          <div className="border-border-warm flex max-w-[calc(100vw-32px)] items-center gap-2.5 rounded-full border bg-[#211e1b] py-2 pl-3.5 pr-4 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.7)]">
            <Terminal
              size={14}
              className="shrink-0"
              style={{ color: note.on ? "#d9b877" : "#8C8270" }}
            />
            <span className="text-cream-soft text-[13px]">
              Developer mode{" "}
              <span
                className="font-medium"
                style={{ color: note.on ? "#d9b877" : "#8C8270" }}
              >
                {note.on ? "on" : "off"}
              </span>
              {note.on && (
                <span className="text-muted-soft"> · sync logs in console</span>
              )}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Re-exported so the shortcut hint stays in one place. */
export { DEV_MODE_SHORTCUT, isDevMode };
