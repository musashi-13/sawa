import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

// First-run prompt for the user's name. Intentionally non-dismissible — no close
// button, no backdrop/Esc close — because App only renders it while the name is
// missing, and we always want a value before proceeding.
interface NameModalProps {
  open: boolean;
  onSave: (name: string) => void;
}

export function NameModal({ open, onSave }: NameModalProps) {
  const keyboardInset = useKeyboardInset();
  const [name, setName] = useState("");

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: "rgba(10,9,8,0.6)",
            paddingBottom: keyboardInset,
            transition: "padding-bottom 0.2s ease",
          }}
        >
          <motion.div
            className="border-border-warm max-h-full w-full max-w-[420px] overflow-y-auto rounded-t-3xl border bg-[#211e1b] p-5 sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <h2 className="text-cream font-serif text-[20px] font-medium">
              Welcome to Sawa 沢
            </h2>
            <p className="text-muted-soft mb-4 mt-1.5 text-[13px] leading-[1.5]">
              A calm place to plan your day. What should we call you?
            </p>

            <input
              autoFocus
              // 16px avoids iOS Safari's auto-zoom on input focus.
              className="border-border-warm bg-bg text-cream placeholder:text-muted-soft focus:border-clay/60 w-full rounded-xl border px-3.5 py-2.5 text-[16px] outline-none"
              placeholder="Your name"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />

            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="bg-clay mt-5 w-full rounded-full py-3 text-[15px] font-medium text-[#2b1610] transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              Begin
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
