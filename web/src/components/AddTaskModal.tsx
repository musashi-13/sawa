import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Layers, Plus, Star, X } from "lucide-react";
import type { NewTaskInput } from "../hooks/useSawa";
import type { Effort } from "../types";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

const EFFORTS: { value: Effort; label: string; hint: string }[] = [
  { value: "S", label: "S", hint: "Small — a quick win" },
  { value: "M", label: "M", hint: "Medium" },
  { value: "L", label: "L", hint: "Large — a longer haul" },
];

interface AddTaskModalProps {
  open: boolean;
  mode: "task" | "bundle";
  onClose: () => void;
  onSave: (input: NewTaskInput, isBundle: boolean) => void;
}

// `datetime-local` gives a value like "2026-07-02T15:30" with no timezone, which
// `new Date(...)` correctly reads as local time.
function toEpoch(value: string): number | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

export function AddTaskModal({ open, mode, onClose, onSave }: AddTaskModalProps) {
  const keyboardInset = useKeyboardInset();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [children, setChildren] = useState<string[]>(["", ""]);
  const [bundle, setBundle] = useState(false);
  const [effort, setEffort] = useState<Effort | undefined>(undefined);
  const [important, setImportant] = useState(false);

  // Reset each time the pane opens; honour how it was opened (task vs bundle).
  useEffect(() => {
    if (open) {
      setBundle(mode === "bundle");
      setTitle("");
      setDescription("");
      setDeadline("");
      setChildren(["", ""]);
      setEffort(undefined);
      setImportant(false);
    }
  }, [open, mode]);

  function handleSave() {
    if (!title.trim()) return;
    const childTitles = children.map((c) => c.trim()).filter(Boolean);
    if (bundle && childTitles.length === 0) return;
    onSave(
      { title, description, deadline: toEpoch(deadline), childTitles, effort, important },
      bundle,
    );
    onClose();
  }

  // 16px avoids iOS Safari's auto-zoom on focus.
  const inputClass =
    "w-full rounded-xl border border-border-warm bg-bg px-3.5 py-2.5 text-[16px] text-cream placeholder:text-muted-soft outline-none focus:border-clay/60";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-cream font-serif text-[18px] font-medium">
                {bundle ? "New bundle" : "New task"}
              </h2>
              <button onClick={onClose} aria-label="Close" className="text-muted">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                className={inputClass}
                placeholder={bundle ? "Bundle title" : "What needs doing?"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !bundle) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />

              {/* Tab from the title lands here — Enter/Space converts to a bundle. */}
              <button
                type="button"
                aria-pressed={bundle}
                onClick={() => setBundle((b) => !b)}
                className="border-border-warm flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors"
                style={{
                  background: bundle ? "#2c2a22" : "transparent",
                  borderColor: bundle ? "#8C6B3A" : undefined,
                }}
              >
                <Layers size={16} className={bundle ? "text-gold" : "text-muted"} />
                <span className="text-[13px] text-cream-soft">
                  {bundle ? "It's a bundle — add tasks inside" : "Make it a bundle"}
                </span>
              </button>

              <textarea
                className={`${inputClass} min-h-[64px] resize-none`}
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <label className="text-muted block text-[12px]">
                Deadline (optional)
                <input
                  type="datetime-local"
                  // iOS clips the value in date/time inputs unless the internal
                  // value box is given room + left-aligned; min-height + the
                  // ::-webkit-date-and-time-value tweaks fix the crop.
                  className={`${inputClass} mt-1.5 block min-h-[48px] appearance-none [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:text-left`}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </label>

              {/* Effort + importance — the two ranking signals. */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <span className="text-muted mb-1.5 block text-[12px]">
                    Effort (optional)
                  </span>
                  <div className="flex gap-1.5">
                    {EFFORTS.map((e) => {
                      const on = effort === e.value;
                      return (
                        <button
                          key={e.value}
                          type="button"
                          title={e.hint}
                          aria-pressed={on}
                          onClick={() =>
                            setEffort((cur) => (cur === e.value ? undefined : e.value))
                          }
                          className="flex-1 rounded-xl border py-2.5 text-[14px] font-medium transition-colors"
                          style={{
                            background: on ? "#2c2a22" : "transparent",
                            borderColor: on ? "#8C6B3A" : "#3a352f",
                            color: on ? "#d9b877" : "#8C8270",
                          }}
                        >
                          {e.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  aria-pressed={important}
                  onClick={() => setImportant((v) => !v)}
                  title="Mark as important — keeps it in view even without a deadline"
                  className="flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] transition-colors"
                  style={{
                    background: important ? "#2c2a22" : "transparent",
                    borderColor: important ? "#8C6B3A" : "#3a352f",
                    color: important ? "#d9b877" : "#8C8270",
                  }}
                >
                  <Star
                    size={15}
                    className="shrink-0"
                    fill={important ? "#d9b877" : "none"}
                  />
                  Important
                </button>
              </div>

              {bundle && (
                <div className="space-y-2">
                  <span className="text-muted block text-[12px]">
                    Tasks inside (unordered)
                  </span>
                  {children.map((c, i) => (
                    <input
                      key={i}
                      className={inputClass}
                      placeholder={`Task ${i + 1}`}
                      value={c}
                      onChange={(e) => {
                        const next = [...children];
                        next[i] = e.target.value;
                        setChildren(next);
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setChildren([...children, ""])}
                    className="text-clay flex items-center gap-1.5 text-[13px]"
                  >
                    <Plus size={15} /> add another
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              className="bg-clay mt-5 w-full rounded-full py-3 text-[15px] font-medium text-[#2b1610] transition-transform active:scale-[0.98]"
            >
              {bundle ? "Seal the bundle" : "Add to stack"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
