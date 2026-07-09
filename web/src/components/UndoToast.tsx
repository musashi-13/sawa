import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import type { UndoState } from "../hooks/useSawa";

// A transient, hovering "Undo" pill for accidental swipes. Shows the last card
// action; auto-dismisses after a few seconds; restoring is one level deep.
const DISMISS_MS = 5000;

interface UndoToastProps {
  action: UndoState | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ action, onUndo, onDismiss }: UndoToastProps) {
  // Reset the auto-dismiss timer whenever a new action arrives (keyed on `at`).
  useEffect(() => {
    if (!action) return;
    const id = setTimeout(onDismiss, DISMISS_MS);
    return () => clearTimeout(id);
  }, [action?.at, onDismiss, action]);

  return (
    <AnimatePresence>
      {action && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        >
          <div className="border-border-warm pointer-events-auto flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-full border bg-[#211e1b] py-2 pl-4 pr-2 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.7)]">
            <span className="text-cream-soft truncate text-[13px]">
              {action.verb}
              {action.title && (
                <span className="text-muted-soft"> · {action.title}</span>
              )}
            </span>
            <button
              onClick={onUndo}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#2c2a22] py-1.5 pl-2.5 pr-3 text-[13px] font-medium text-[#d9b877] transition-transform active:scale-[0.96] hover:bg-[#35322a]"
            >
              <RotateCcw size={14} /> Undo
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
