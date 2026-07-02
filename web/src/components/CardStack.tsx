import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { Check, CornerDownRight, Layers, RotateCcw, Trash2, X } from "lucide-react";
import type { Task } from "../types";
import { DeadlineChip } from "./DeadlineChip";
import { resolveAction } from "../lib/keymap";

export type StackMode = "stack" | "failed";

const VISIBLE = 7;
const STEP = 13; // vertical peek between stacked cards
const SCALE_STEP = 0.05;
const SWIPE_THRESHOLD = 110;
const VELOCITY_THRESHOLD = 550;

// Darkening slabs behind the front parchment card (front -> back).
const BACK_COLORS = ["#A79C86", "#6E6555", "#4E473C", "#39342D", "#322E2A", "#2C2925"];

/** Keyboard/programmatic command to the top card. `n` is a monotonic nonce. */
export interface StackCommand {
  dir: "left" | "right";
  n: number;
}

interface CardStackProps {
  tasks: Task[];
  /** "stack" = normal; "failed" = the Failed bin (right swipe revives). */
  mode?: StackMode;
  /** When false, keyboard shortcuts are ignored (e.g. a modal is open). */
  keyboardEnabled?: boolean;
  onComplete: (id: string) => void;
  onPostpone: (id: string) => void;
  onUnfold: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CardStack({
  tasks,
  mode = "stack",
  keyboardEnabled = true,
  onComplete,
  onPostpone,
  onUnfold,
  onDelete,
}: CardStackProps) {
  const visible = tasks.slice(0, VISIBLE);
  const [command, setCommand] = useState<StackCommand | null>(null);

  useEffect(() => {
    if (!keyboardEnabled) return;
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const top = visible[0];
      if (!top) return;
      const action = resolveAction(e);
      if (action === "complete") {
        e.preventDefault();
        setCommand((c) => ({ dir: "right", n: (c?.n ?? 0) + 1 }));
      } else if (action === "postpone") {
        e.preventDefault();
        setCommand((c) => ({ dir: "left", n: (c?.n ?? 0) + 1 }));
      } else if (action === "delete") {
        e.preventDefault();
        onDelete(top.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboardEnabled, visible, onDelete]);

  return (
    <div className="relative mx-auto h-[260px] w-full">
      <AnimatePresence initial={false}>
        {visible.length === 0 ? (
          <EmptyState key="empty" />
        ) : (
          visible
            .map((task, i) => (
              <StackCard
                key={task.id}
                task={task}
                depth={i}
                isTop={i === 0}
                mode={mode}
                command={command}
                onComplete={onComplete}
                onPostpone={onPostpone}
                onUnfold={onUnfold}
                onDelete={onDelete}
              />
            ))
            // Render back-to-front so DOM order matches z-stacking.
            .reverse()
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
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

interface StackCardProps {
  task: Task;
  depth: number;
  isTop: boolean;
  mode: StackMode;
  command: StackCommand | null;
  onComplete: (id: string) => void;
  onPostpone: (id: string) => void;
  onUnfold: (id: string) => void;
  onDelete: (id: string) => void;
}

function StackCard({
  task,
  depth,
  isTop,
  mode,
  command,
  onComplete,
  onPostpone,
  onUnfold,
  onDelete,
}: StackCardProps) {
  const failed = mode === "failed";
  // Right swipe: revive in the Failed bin, unfold a bundle, else complete.
  const rightAction = () => {
    if (failed) onComplete(task.id);
    else if (task.isBundle) onUnfold(task.id);
    else onComplete(task.id);
  };
  // Left swipe: discard in the Failed bin, otherwise postpone.
  const leftAction = () => (failed ? onDelete(task.id) : onPostpone(task.id));
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-7, 7]);
  const completeHint = useTransform(x, [25, 150], [0, 1]);
  const postponeHint = useTransform(x, [-150, -25], [1, 0]);
  // Fade as the card travels — so a long desktop fling dissolves, not just exits.
  const dragOpacity = useTransform(x, [-380, -90, 0, 90, 380], [0, 0.8, 1, 0.8, 0]);
  const [committing, setCommitting] = useState(false);
  const committingRef = useRef(false);

  const fly = (dir: 1 | -1, after: () => void) => {
    if (committingRef.current) return;
    committingRef.current = true;
    setCommitting(true);
    const distance = (typeof window !== "undefined" ? window.innerWidth : 600) * 1.3;
    animate(x, dir * distance, {
      duration: 0.34,
      ease: [0.32, 0, 0.67, 0],
    }).finished.then(() => {
      after();
      // For postpone the card stays mounted (re-ranked to the back) — snap home.
      x.set(0);
      committingRef.current = false;
      setCommitting(false);
    });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const goRight =
      info.offset.x > SWIPE_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD;
    const goLeft =
      info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD;

    if (goRight) {
      fly(1, rightAction);
    } else if (goLeft) {
      fly(-1, leftAction);
    } else {
      animate(x, 0, { type: "spring", stiffness: 520, damping: 34 });
    }
  };

  // React to keyboard commands. Every card tracks the latest nonce so that a
  // card promoted to the top later doesn't replay a stale command.
  const lastCmdN = useRef(command?.n ?? 0);
  useEffect(() => {
    if (!command || command.n === lastCmdN.current) return;
    if (isTop) {
      if (command.dir === "right") fly(1, rightAction);
      else fly(-1, leftAction);
    }
    lastCmdN.current = command.n;
    // fly + handlers are stable enough for this trigger; nonce guards re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, isTop]);

  const isParchment = isTop;
  const back = BACK_COLORS[Math.min(depth - 1, BACK_COLORS.length - 1)] ?? "#2C2925";

  return (
    <motion.div
      className="no-select absolute inset-x-0 bottom-0 h-[185px] overflow-hidden rounded-[22px]"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? dragOpacity : undefined,
        transformOrigin: "bottom center",
        zIndex: 100 - depth,
        background: isParchment
          ? "linear-gradient(158deg,#E6DDC9 0%,#DBD0B6 55%,#CDC0A3 100%)"
          : back,
        border: task.isBundle && isParchment
          ? "1px solid #D8C9A8"
          : isParchment
            ? "1px solid rgba(120,92,50,0.18)"
            : "none",
        boxShadow: isTop ? "0 18px 40px -16px rgba(20,14,8,0.6)" : "none",
        touchAction: "pan-y",
        cursor: isTop ? "grab" : "default",
        pointerEvents: isTop ? "auto" : "none",
      }}
      initial={{ y: -depth * STEP - 16, scale: 1 - depth * SCALE_STEP, opacity: 0 }}
      animate={{
        y: -depth * STEP,
        scale: 1 - depth * SCALE_STEP,
        ...(isTop ? {} : { opacity: depth > 5 ? 0 : 1 }),
      }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      drag={isTop && !committing ? "x" : false}
      dragSnapToOrigin={false}
      dragElastic={0.7}
      dragMomentum={false}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
    >
      {isTop && (
        <TaskCardContent
          task={task}
          failed={failed}
          completeHint={completeHint}
          postponeHint={postponeHint}
          onDelete={() => onDelete(task.id)}
        />
      )}
    </motion.div>
  );
}

interface TaskCardContentProps {
  task: Task;
  failed: boolean;
  completeHint: MotionValue<number>;
  postponeHint: MotionValue<number>;
  onDelete: () => void;
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

function TaskCardContent({
  task,
  failed,
  completeHint,
  postponeHint,
  onDelete,
}: TaskCardContentProps) {
  const childCount = task.childTitles?.length ?? 0;
  const accent = task.isBundle ? "#B8915A" : failed ? "#C0584A" : "#C96442";
  return (
    <div className="relative h-full overflow-hidden py-[18px] pl-[22px] pr-[18px]">
      {/* Decorative layers (behind the text) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 0,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(120,92,50,0.045) 0 1px, transparent 1px 7px)",
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
        style={{ zIndex: 0, fontSize: 110, color: "rgba(43,39,34,0.05)" }}
      >
        沢
      </span>

      {/* Directional wash — tints the whole card as you drag, so the pending
          action reads clearly even when a thumb covers the side badge. Sits
          above the paper texture (z1) but below the title text (z10). */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 1,
          opacity: completeHint,
          background: failed
            ? "linear-gradient(270deg, rgba(140,107,58,0.34), transparent 62%)"
            : task.isBundle
              ? "linear-gradient(270deg, rgba(184,145,90,0.36), transparent 62%)"
              : "linear-gradient(270deg, rgba(44,110,79,0.34), transparent 62%)",
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 1,
          opacity: postponeHint,
          background: failed
            ? "linear-gradient(90deg, rgba(138,45,28,0.34), transparent 62%)"
            : "linear-gradient(90deg, rgba(201,100,66,0.32), transparent 62%)",
        }}
      />

      {/* Right-swipe badge: revive (failed bin), unfold (bundle), or complete */}
      <motion.div
        className="pointer-events-none absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-md"
        style={{
          zIndex: 20,
          opacity: completeHint,
          background: failed ? "#8C6B3A" : task.isBundle ? "#B8915A" : "#2C6E4F",
        }}
      >
        {failed ? (
          <RotateCcw size={24} className="text-[#F3E7D2]" />
        ) : task.isBundle ? (
          <Layers size={24} className="text-[#3E2E14]" />
        ) : (
          <Check size={24} className="text-white" />
        )}
      </motion.div>
      <motion.div
        className="pointer-events-none absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-md"
        style={{
          zIndex: 20,
          opacity: postponeHint,
          background: failed ? "#8A2D1C" : "#C96442",
        }}
      >
        {failed ? (
          <Trash2 size={22} className="text-white" />
        ) : (
          <CornerDownRight size={22} className="rotate-180 text-white" />
        )}
      </motion.div>

      <button
        onClick={onDelete}
        aria-label="Delete task"
        className="absolute right-3 top-3 z-10 text-[#a89e89] transition-colors hover:text-[#9C4A2C]"
      >
        <X size={16} />
      </button>

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

      <div className="relative z-10 pr-5 font-serif text-[20px] leading-[1.3] text-[#2B2722]">
        {task.title}
      </div>

      {task.description && (
        <p className="relative z-10 mt-2 line-clamp-2 pr-3 text-[13px] leading-[1.45] text-[#6F6450]">
          {task.description}
        </p>
      )}

      <div className="absolute bottom-4 left-[18px] z-10">
        {failed ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: "#E9C7C0", color: "#8A2D1C" }}
          >
            {missedLabel(task.deadline)}
          </span>
        ) : (
          <DeadlineChip task={task} />
        )}
      </div>
    </div>
  );
}
