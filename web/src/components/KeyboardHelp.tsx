import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { DEFAULT_KEYMAP } from "../lib/keymap";

export function KeyboardHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ background: "rgba(10,9,8,0.6)" }}
        >
          <motion.div
            className="border-border-warm w-full max-w-[360px] rounded-3xl border bg-[#211e1b] p-5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-cream font-serif text-[18px] font-medium">
                Keyboard
              </h2>
              <button onClick={onClose} aria-label="Close" className="text-muted">
                <X size={20} />
              </button>
            </div>
            <ul className="space-y-2.5">
              {DEFAULT_KEYMAP.map((b) => (
                <li key={b.action} className="flex items-center gap-3">
                  <kbd className="border-border-warm text-cream-soft inline-block min-w-[64px] rounded-md border bg-[#1a1815] px-2 py-1 text-center text-[12px]">
                    {b.display}
                  </kbd>
                  <span className="text-muted text-[13px]">{b.help}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
