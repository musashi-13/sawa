import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import { Check, CornerDownRight, Layers, Repeat, RotateCcw, Star, Trash2, X } from "lucide-react";
import type { Effort } from "../types";
import type { Task } from "../types";
import type { CardTheme } from "../lib/cardThemes";
import { DeadlineChip } from "./DeadlineChip";
import { resolveAction } from "../lib/keymap";

export type StackMode = "stack" | "failed";

const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;
const STEP = 12; // vertical peek between stacked cards
const SCALE_STEP = 0.05;
// Deep peek edges stay neutral-dark regardless of theme (they're barely visible
// shadow slabs behind the top two cards).
const SLAB = ["#4E473C", "#39342D", "#322E2A", "#2C2925"];
// Near-black cards that drop into the back of the stack when a bundle unfolds —
// always three, regardless of how many subtasks it holds.
const SCATTER = ["#26221E", "#1F1B18", "#181512"];

// ─────────────────────────────────────────────────────────────────────────────
// CardStack — a single interactive top card over static peek cards.
//
// Only the top card drags and animates; the cards behind are plain static
// layers. Committing a swipe changes the data, which changes the top card's
// key, so AnimatePresence flies the old card out and scales the next one up.
// There is no shared drag state, no opacity tied to drag position, and no
// re-ranking of a live multi-card stack — the classes of bug that caused the
// mid-swipe flashes and the invisible last card.
// ─────────────────────────────────────────────────────────────────────────────

interface CardStackProps {
  tasks: Task[];
  theme: CardTheme;
  mode?: StackMode;
  keyboardEnabled?: boolean;
  onComplete: (id: string) => void;
  onPostpone: (id: string) => void;
  onUnfold: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CardStack({
  tasks,
  theme,
  mode = "stack",
  keyboardEnabled = true,
  onComplete,
  onPostpone,
  onUnfold,
  onDelete,
}: CardStackProps) {
  const visible = tasks.slice(0, 4);
  const top = visible[0];
  const peeks = visible.slice(1); // depth 1..3, rendered behind the top
  const failed = mode === "failed";

  // Drag offset of the top card → drives the static side indicators only.
  const hintX = useMotionValue(0);
  const completeHint = useTransform(hintX, [30, 130], [0, 1]);
  const postponeHint = useTransform(hintX, [-130, -30], [1, 0]);
  const completeScale = useTransform(hintX, [30, 130], [0.7, 1]);
  const postponeScale = useTransform(hintX, [-130, -30], [1, 0.7]);
  // The top card exits (flies off) ONLY when the user swipes it — never when the
  // queue merely reorders and a different task becomes the top (that used to
  // fling the demoted card across the screen: the "ghost card" bug). `flyOnExit`
  // records the intent; the exit variant reads it, and it resets after each fly.
  const flyOnExit = useRef(false);
  const exitDir = useRef<1 | -1>(1);
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 600;

  // One-shot "cards added to the back" flourish when a bundle unfolds.
  const [scattering, setScattering] = useState(false);
  const scatterTimer = useRef<number | undefined>(undefined);
  function triggerScatter() {
    setScattering(true);
    window.clearTimeout(scatterTimer.current);
    scatterTimer.current = window.setTimeout(() => setScattering(false), 650);
  }
  useEffect(() => () => window.clearTimeout(scatterTimer.current), []);

  function act(dir: 1 | -1, task: Task) {
    if (dir > 0) {
      if (failed) onComplete(task.id);
      else if (task.isBundle) onUnfold(task.id);
      else onComplete(task.id);
    } else {
      if (failed) onDelete(task.id);
      else onPostpone(task.id);
    }
  }

  function commit(dir: 1 | -1) {
    if (!top) return;
    hintX.set(0);
    // Unfolding a bundle scatters new cards into the stack — play the flourish.
    if (dir > 0 && !failed && top.isBundle) triggerScatter();
    // Mark this top-card removal as a swipe, so its exit flies it off. The data
    // change below drives the exit; a reorder never sets this flag, so a merely
    // demoted top card exits instantly instead.
    flyOnExit.current = true;
    exitDir.current = dir;
    act(dir, top);
  }

  useEffect(() => {
    if (!keyboardEnabled) return;
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (!top) return;
      const action = resolveAction(e);
      if (action === "complete") {
        e.preventDefault();
        commit(1);
      } else if (action === "postpone") {
        e.preventDefault();
        commit(-1);
      } else if (action === "delete") {
        e.preventDefault();
        onDelete(top.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // commit closes over top/failed; re-subscribe when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardEnabled, top, failed]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    hintX.set(0);
    const goRight =
      info.offset.x > SWIPE_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD;
    const goLeft =
      info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD;
    // The dragged card IS the one that exits, so the fly-off continues seamlessly
    // from the release position — no offset hand-off needed.
    if (goRight) commit(1);
    else if (goLeft) commit(-1);
  }

  return (
    <div className="relative mx-auto h-[260px] w-full">
      {/* Static peek cards behind the top (back-to-front). */}
      {peeks
        .map((task, i) => (
          <PeekCard key={task.id} task={task} depth={i + 1} failed={failed} theme={theme} />
        ))
        .reverse()}

      {/* Bundle unfold: three dark cards drop into the back of the stack. They
          sit above the real (paper) peeks briefly, then fade to reveal them. */}
      <AnimatePresence>
        {scattering &&
          [0, 1, 2].map((i) => {
            const depth = i + 1;
            return (
              <motion.div
                key={`scatter-${i}`}
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[185px] rounded-[22px]"
                style={{
                  zIndex: 47 - i,
                  transformOrigin: "bottom center",
                  background: SCATTER[i],
                  boxShadow: "0 -6px 16px -10px rgba(0,0,0,0.6)",
                }}
                initial={{ y: 28, opacity: 0, scale: 1 - depth * SCALE_STEP }}
                animate={{ y: -depth * STEP, opacity: 1, scale: 1 - depth * SCALE_STEP }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={{ delay: i * 0.09, type: "spring", stiffness: 320, damping: 30 }}
              />
            );
          })}
      </AnimatePresence>

      {/* The interactive top card, rendered at rest (no entrance animation, so
          it can't get stuck at an initial offset). It has NO exit either: when
          the queue reorders and a different task becomes the top, the stack just
          re-lays-out — the old top drops to a peek instead of being flung off. */}
      <AnimatePresence
        custom={{ fly: flyOnExit.current, dir: exitDir.current }}
        initial={false}
        onExitComplete={() => {
          flyOnExit.current = false;
        }}
      >
        {top ? (
          <motion.div
            key={top.id}
            custom={{ fly: flyOnExit.current, dir: exitDir.current }}
            className="no-select absolute inset-x-0 bottom-0 h-[185px] overflow-hidden rounded-[22px]"
            style={{
              zIndex: 50,
              transformOrigin: "bottom center",
              background: theme.bg,
              border: `1px solid ${top.isBundle ? theme.borderBundle : theme.border}`,
              boxShadow: "0 18px 40px -16px rgba(20,14,8,0.6)",
              touchAction: "pan-y",
              cursor: "grab",
            }}
            variants={{
              exit: (c: { fly: boolean; dir: 1 | -1 }) =>
                c.fly
                  ? {
                      // Swiped away: fly off-screen, lifted above the new top.
                      zIndex: 70,
                      x: c.dir * viewportW * 1.15,
                      rotate: c.dir * 8,
                      opacity: 0,
                      transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] },
                    }
                  : // Merely reordered to a peek: vanish instantly, no fly-off.
                    { opacity: 0, transition: { duration: 0 } },
            }}
            exit="exit"
            drag="x"
            dragSnapToOrigin
            dragElastic={0.55}
            whileDrag={{ cursor: "grabbing" }}
            onDrag={(_, info) => hintX.set(info.offset.x)}
            onDragEnd={handleDragEnd}
          >
            <TaskCardContent
              task={top}
              failed={failed}
              theme={theme}
              onDelete={() => onDelete(top.id)}
            />
          </motion.div>
        ) : (
          <EmptyState key="empty" />
        )}
      </AnimatePresence>

      {/* Static swipe indicators, pinned to the sides. */}
      {top && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[185px] items-center justify-between px-2"
          style={{ zIndex: 60 }}
        >
          <motion.div
            className="flex h-11 w-11 items-center justify-center rounded-full shadow-md"
            style={{
              opacity: postponeHint,
              scale: postponeScale,
              background: failed ? "#8A2D1C" : "#C96442",
            }}
          >
            {failed ? (
              <Trash2 size={22} className="text-white" />
            ) : (
              <CornerDownRight size={22} className="rotate-180 text-white" />
            )}
          </motion.div>
          <motion.div
            className="flex h-11 w-11 items-center justify-center rounded-full shadow-md"
            style={{
              opacity: completeHint,
              scale: completeScale,
              background: failed ? "#8C6B3A" : top.isBundle ? "#B8915A" : "#2C6E4F",
            }}
          >
            {failed ? (
              <RotateCcw size={24} className="text-[#F3E7D2]" />
            ) : top.isBundle ? (
              <Layers size={24} className="text-[#3E2E14]" />
            ) : (
              <Check size={24} className="text-white" />
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

/** A static, non-interactive card behind the top one. Depth 1 shows content so
 *  swiping the top away reveals a real card; deeper cards are dark stacked edges. */
function PeekCard({
  task,
  depth,
  failed,
  theme,
}: {
  task: Task;
  depth: number;
  failed: boolean;
  theme: CardTheme;
}) {
  const paper = depth === 1;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[185px] overflow-hidden rounded-[22px]"
      style={{
        zIndex: 40 - depth,
        transformOrigin: "bottom center",
        transform: `translateY(${-depth * STEP}px) scale(${1 - depth * SCALE_STEP})`,
        background: paper ? theme.bg : SLAB[Math.min(depth - 2, SLAB.length - 1)],
        filter: paper ? "brightness(0.9)" : undefined,
        border: paper ? `1px solid ${theme.border}` : "none",
      }}
    >
      {paper && <TaskCardContent task={task} failed={failed} theme={theme} peek />}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      key="empty"
      className="absolute inset-x-0 bottom-0 flex h-[185px] flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <span className="text-cream-soft font-serif text-[20px]">All clear</span>
      <span className="text-muted-soft mt-1 text-[13px]">
        The stream is calm. Add a task below.
      </span>
    </motion.div>
  );
}

interface TaskCardContentProps {
  task: Task;
  failed: boolean;
  theme: CardTheme;
  onDelete?: () => void;
  peek?: boolean;
}

const EFFORT_LABEL: Record<Effort, string> = { S: "Quick", M: "Medium", L: "Long" };
const EFFORT_DOTS: Record<Effort, number> = { S: 1, M: 2, L: 3 };

/** A subtle size marker on the card: 1–3 dots for quick → long. */
function EffortChip({ effort, theme }: { effort: Effort; theme: CardTheme }) {
  return (
    <span
      title={`${EFFORT_LABEL[effort]} effort`}
      className="inline-flex shrink-0 items-center gap-[3px] rounded-full px-2 py-[6px]"
      style={{ background: theme.chipBg }}
    >
      {Array.from({ length: EFFORT_DOTS[effort] }).map((_, i) => (
        <span
          key={i}
          className="h-[4px] w-[4px] rounded-full"
          style={{ background: theme.chipInk }}
        />
      ))}
    </span>
  );
}

function missedLabel(deadline?: number): string {
  if (deadline === undefined) return "Missed";
  return (
    "Missed " +
    new Date(deadline).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  );
}

function TaskCardContent({ task, failed, theme, onDelete, peek }: TaskCardContentProps) {
  const childCount = task.childTitles?.length ?? 0;
  const accent = task.isBundle ? "#B8915A" : failed ? "#C0584A" : "#C96442";
  return (
    <div className="relative h-full overflow-hidden py-[18px] pl-[22px] pr-[18px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `repeating-linear-gradient(90deg, ${theme.grain} 0 1px, transparent 1px 7px)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 top-0 w-[4px]"
        style={{ zIndex: 0, background: accent }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-5 right-0 select-none font-serif leading-none"
        style={{ zIndex: 0, fontSize: 110, color: theme.watermark }}
      >
        沢
      </span>

      {!peek && onDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete task"
          className="absolute right-3 top-3 z-10 transition-colors hover:text-[#9C4A2C]"
          style={{ color: theme.deleteInk }}
        >
          <X size={16} />
        </button>
      )}

      {task.isBundle ? (
        <div className="relative z-10 mb-3 flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#8C6B3A] bg-[#B8915A] text-[16px] text-[#3E2E14]">
            束
          </span>
          <span className="text-[11px] font-medium tracking-[1.5px] text-[#8C6B3A]">
            BUNDLE · {childCount} INSIDE
          </span>
        </div>
      ) : task.parentTitle ? (
        <div className="relative z-10 mb-2.5 mt-1 flex items-center gap-1.5 text-[11px] tracking-[0.5px] text-[#9C4A2C]">
          <CornerDownRight size={14} />
          from {task.parentTitle}
        </div>
      ) : (
        <div className="mt-1" />
      )}

      <div
        className="relative z-10 pr-5 font-serif text-[20px] leading-[1.3]"
        style={{ color: theme.ink }}
      >
        {task.title}
      </div>

      {task.description && (
        <p
          className="relative z-10 mt-2 line-clamp-2 pr-3 text-[13px] leading-[1.45]"
          style={{ color: theme.inkSoft }}
        >
          {task.description}
        </p>
      )}

      <div className="absolute bottom-4 left-[18px] right-[18px] z-10 flex items-center gap-2">
        {failed ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: "#E9C7C0", color: "#8A2D1C" }}
          >
            {missedLabel(task.deadline)}
          </span>
        ) : task.templateId ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: theme.chipBg, color: theme.chipInk }}
          >
            <Repeat size={12} /> Daily
          </span>
        ) : (
          <DeadlineChip task={task} />
        )}
        {task.effort && <EffortChip effort={task.effort} theme={theme} />}
        {task.important && (
          <Star
            size={15}
            className="ml-auto shrink-0"
            style={{ color: "#B8915A", fill: "#B8915A" }}
            aria-label="Important"
          />
        )}
      </div>
    </div>
  );
}
