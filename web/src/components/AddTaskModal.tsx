import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Layers, Plus, X } from "lucide-react";
import type { NewTaskInput } from "../hooks/useSawa";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

interface AddTaskModalProps {
  open: boolean;
  mode: "task" | "bundle";
  onClose: () => void;
  onSave: (input: NewTaskInput, isBundle: boolean) => void;
}

function toEpoch(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).getTime();
}

export function AddTaskModal({ open, mode, onClose, onSave }: AddTaskModalProps) {
  const keyboardInset = useKeyboardInset();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [children, setChildren] = useState<string[]>(["", ""]);
  const [bundle, setBundle] = useState(false);

  // Reset each time the pane opens; honour how it was opened (task vs bundle).
  useEffect(() => {
    if (open) {
      setBundle(mode === "bundle");
      setTitle("");
      setDescription("");
      setDeadline("");
      setChildren(["", ""]);
    }
  }, [open, mode]);

  function handleSave() {
    if (!title.trim()) return;
    const childTitles = children.map((c) => c.trim()).filter(Boolean);
    if (bundle && childTitles.length === 0) return;
    onSave(
      { title, description, deadline: toEpoch(deadline), childTitles },
      bundle,
    );
    onClose();
  }

  const inputClass =
    "w-full rounded-xl border border-border-warm bg-bg px-3.5 py-2.5 text-[15px] text-cream placeholder:text-muted-soft outline-none focus:border-clay/60";

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
                  type="date"
                  className={`${inputClass} mt-1.5`}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </label>

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
