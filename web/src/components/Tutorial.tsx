import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Settings2 } from "lucide-react";
import { SawaStamp } from "./SawaStamp";

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial — a first-run, spotlight walkthrough.
//
// Each step points at a real element in the page (matched by a `data-tour`
// attribute) and dims everything else with a cut-out spotlight. The tour is
// guided: it advances only via the Next button (or ← / → / Enter / Esc), so no
// stray click on the app underneath can derail it. It is purely presentational
// — it reads the live DOM for element rects and never touches app state.
// ─────────────────────────────────────────────────────────────────────────────

interface Step {
  /** Value of the `data-tour` attribute on the element to spotlight. */
  target: string;
  title: string;
  /** Body copy; wrap words in **double asterisks** to emphasize them, and use
   *  the `[settings]` token to inline the Settings icon. */
  body: string;
  /** Pill-shaped targets get a fully-rounded highlight; others a soft radius. */
  pill?: boolean;
}

const STEPS: Step[] = [
  {
    target: "add",
    pill: true,
    title: "Stack up your day",
    body: "Tap **Add a task** to drop a card onto the stack. Swipe a card **right to complete**, **left to postpone**. Whatever you can do now floats to the top.",
  },
  {
    target: "streams",
    title: "Flow between streams",
    body: "Your tasks live in **streams**. Sawa starts you with three: Daily, Projects and Errands. Use the arrows to move between them, and the [settings] button up top to rename, reorder, add or remove them.",
  },
  {
    target: "bundle",
    pill: true,
    title: "Bundle bigger quests",
    body: "A **bundle** (束) holds several subtasks. Swipe it right to **unfold** its pieces into the stack as separate cards. No fixed order, just pick what you can do now.",
  },
  {
    target: "streak",
    pill: true,
    title: "Keep the streak alive",
    body: "Finish at least **one task a day** and your streak grows. Miss a day and it resets.",
  },
];

const PAD = 8; // breathing room around the spotlit element
const DIM = "0 0 0 9999px rgba(13,10,8,0.76)";

function renderBody(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\[settings\])/g).map((seg, i) => {
    if (seg === "[settings]") {
      return (
        <Settings2 key={i} size={14} className="text-cream mx-0.5 inline align-middle" />
      );
    }
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return (
        <strong key={i} className="text-cream font-medium">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{seg}</span>;
  });
}

interface TutorialProps {
  open: boolean;
  onClose: () => void;
}

export function Tutorial({ open, onClose }: TutorialProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  // Reset to the first step every time the tour is (re)opened.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Measure the current target element. Re-run on step change, resize, scroll.
  const measure = useCallback(() => {
    if (!open) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [open, step.target]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  // Place the tooltip above or below the spotlight, clamped to the viewport.
  useLayoutEffect(() => {
    if (!open || !rect || !tipRef.current) {
      setTip(null);
      return;
    }
    const t = tipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 18;
    // Put the tooltip on whichever side has more room.
    const below = rect.top < vh * 0.45;
    let top = below ? rect.bottom + gap : rect.top - t.height - gap;
    top = Math.max(12, Math.min(top, vh - t.height - 12));
    let left = rect.left + rect.width / 2 - t.width / 2;
    left = Math.max(12, Math.min(left, vw - t.width - 12));
    setTip({ top, left });
  }, [open, rect, index]);

  // Guided navigation via the keyboard. Capture phase + stopPropagation so the
  // app's global shortcuts (stream nav, card actions) never fire during the tour.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        setIndex((i) => {
          if (i >= STEPS.length - 1) {
            onClose();
            return i;
          }
          return i + 1;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  function next() {
    if (last) onClose();
    else setIndex((i) => i + 1);
  }
  function back() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const radius = rect ? (step.pill ? rect.height / 2 + PAD : 16) : 16;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Click-catcher: blocks interaction with the app underneath. The tour
              is driven only by its own buttons, so this swallows stray clicks. */}
          <div className="absolute inset-0" />

          {/* Spotlight: a transparent hole with a huge box-shadow doing the dim.
              It glides between targets as the step changes. */}
          {rect && (
            <motion.div
              className="pointer-events-none absolute"
              initial={false}
              animate={{
                top: rect.top - PAD,
                left: rect.left - PAD,
                width: rect.width + PAD * 2,
                height: rect.height + PAD * 2,
              }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              style={{
                borderRadius: radius,
                boxShadow: DIM,
                outline: "1.5px solid rgba(201,100,66,0.55)",
                outlineOffset: 0,
              }}
            />
          )}
          {/* No target found (shouldn't happen on the main screen): dim fully. */}
          {!rect && <div className="absolute inset-0" style={{ background: "rgba(13,10,8,0.76)" }} />}

          {/* Tooltip card. */}
          <motion.div
            ref={tipRef}
            key={index}
            className="border-border-warm absolute w-[300px] max-w-[calc(100vw-24px)] rounded-2xl border bg-[#211e1b] p-5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.7)]"
            style={{
              top: tip?.top ?? -9999,
              left: tip?.left ?? -9999,
              opacity: tip ? 1 : 0,
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: tip ? 1 : 0, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <SawaStamp size={26} />
              <span className="text-muted-soft text-[11px] font-medium tracking-[1.5px]">
                {String(index + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
              </span>
            </div>

            <h2 className="text-cream font-serif text-[19px] font-medium leading-tight">
              {step.title}
            </h2>
            <p className="text-muted-soft mt-2 text-[13.5px] leading-[1.55]">
              {renderBody(step.body)}
            </p>

            <div className="mt-4 flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full transition-colors"
                    style={{ background: i === index ? "#C96442" : "#4E473C" }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {index > 0 && (
                  <button
                    onClick={back}
                    className="text-muted hover:text-cream-soft rounded-full px-3 py-1.5 text-[13px] transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  className="rounded-full bg-[#C96442] px-4 py-1.5 text-[13px] font-medium text-[#2B1B12] transition-transform active:scale-[0.97] hover:bg-[#d17150]"
                >
                  {last ? "Begin" : "Next"}
                </button>
              </div>
            </div>

            {index < STEPS.length - 1 && (
              <button
                onClick={onClose}
                className="text-muted hover:text-cream-soft mt-2 w-full py-1 text-center text-[12px] transition-colors"
              >
                Skip walkthrough
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
