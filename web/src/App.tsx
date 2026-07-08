import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSawa, type NewTaskInput } from "./hooks/useSawa";
import { InkWash } from "./components/InkWash";
import { TopBar } from "./components/TopBar";
import { CardStack } from "./components/CardStack";
import { StreamSwitcher } from "./components/StreamSwitcher";
import { AddBar } from "./components/AddBar";
import { AddTaskModal } from "./components/AddTaskModal";
import { StreamManagerModal } from "./components/StreamManagerModal";
import { KeyboardHelp } from "./components/KeyboardHelp";
import { Tutorial } from "./components/Tutorial";
import { resolveAction } from "./lib/keymap";

// Shown once per device on first use; the replay button re-opens it any time.
const TOUR_DONE_KEY = "sawa.tour.v1.done";

interface AppProps {
  /** Auth profile control (Clerk), injected only when Clerk is enabled. */
  profileSlot?: ReactNode;
  /** Signed-in user's name from Clerk, used to fill the greeting. */
  clerkName?: string;
  /**
   * True while the sign-in decision is still pending (Clerk build only), so the
   * first-run tour waits until the sign-in sheet is resolved before opening.
   */
  authPending?: boolean;
}

export default function App({ profileSlot, clerkName, authPending = false }: AppProps) {
  const {
    data,
    userName,
    streams,
    activeStream,
    activeViewName,
    isFailedView,
    viewCount,
    streamIndex,
    failedDotIndex,
    activeTasks,
    leftCount,
    failedCount,
    completedToday,
    streak,
    actions,
  } = useSawa();

  const [modal, setModal] = useState<{ open: boolean; mode: "task" | "bundle" }>({
    open: false,
    mode: "task",
  });
  const [help, setHelp] = useState(false);
  const [manage, setManage] = useState(false);
  const [tour, setTour] = useState(false);
  const tourStarted = useRef(false);

  // A signed-in Clerk user fills the greeting from their account name.
  useEffect(() => {
    if (clerkName && !userName) actions.setUserName(clerkName);
  }, [clerkName, userName, actions]);

  // First-run walkthrough: open once the sign-in decision is resolved, unless
  // the user has already seen (or replayed and dismissed) it on this device.
  useEffect(() => {
    if (tourStarted.current || authPending) return;
    const seen =
      typeof window !== "undefined" &&
      localStorage.getItem(TOUR_DONE_KEY) === "1";
    if (!seen) {
      tourStarted.current = true;
      setTour(true);
    }
  }, [authPending]);

  function closeTour() {
    if (typeof window !== "undefined") localStorage.setItem(TOUR_DONE_KEY, "1");
    setTour(false);
  }

  const overlayOpen = modal.open || help || manage || tour;
  const { nextStream, prevStream, moveActiveStream } = actions;

  // Task count per stream, for the manage sheet's delete confirmation.
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of data.tasks) counts[t.streamId] = (counts[t.streamId] ?? 0) + 1;
    return counts;
  }, [data.tasks]);

  // App-level shortcuts. Card actions (complete/postpone/delete) live in CardStack.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const action = resolveAction(e);
      if (action === "close") {
        setModal((m) => ({ ...m, open: false }));
        setHelp(false);
        setManage(false);
        return;
      }
      if (modal.open || manage) return;

      switch (action) {
        case "addTask": // let a focused button handle its own Space
          if (tag === "button") return;
          e.preventDefault();
          setModal({ open: true, mode: "task" });
          break;
        case "prevStream":
          prevStream();
          break;
        case "nextStream":
          nextStream();
          break;
        case "moveStreamEarlier":
          moveActiveStream(-1);
          break;
        case "moveStreamLater":
          moveActiveStream(1);
          break;
        case "toggleHelp":
          setHelp((h) => !h);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.open, manage, prevStream, nextStream, moveActiveStream]);

  function handleSave(input: NewTaskInput, isBundle: boolean) {
    const targetId = activeStream?.id ?? streams[0]?.id;
    if (!targetId) return;
    actions.addTask(targetId, input, isBundle);
  }

  const noop = () => {};

  return (
    <div className="relative min-h-dvh w-full overflow-y-auto">
      <InkWash />

      <div className="relative z-10 flex min-h-dvh items-center justify-center px-5 py-8">
        <main className="flex w-full max-w-[400px] origin-center flex-col md:scale-[1.08] lg:scale-[1.2]">
          <TopBar
            name={userName ?? ""}
            streak={streak}
            leftCount={leftCount}
            completedToday={completedToday}
            failedCount={failedCount}
            failedView={isFailedView}
            onManageStreams={() => setManage(true)}
            profileSlot={profileSlot}
          />

          <div className="mt-7 flex flex-col gap-6">
            <CardStack
              // Remount per stream so switching tears down the old stack cleanly
              // instead of cross-fading old + new cards (which left a blank card).
              key={activeStream?.id ?? "failed"}
              tasks={activeTasks}
              mode={isFailedView ? "failed" : "stack"}
              keyboardEnabled={!overlayOpen}
              onComplete={isFailedView ? actions.revive : actions.complete}
              onPostpone={isFailedView ? noop : actions.postpone}
              onUnfold={isFailedView ? actions.revive : actions.unfoldBundle}
              onDelete={actions.remove}
            />

            <StreamSwitcher
              name={activeViewName}
              count={viewCount}
              index={streamIndex}
              failedDotIndex={failedDotIndex}
              onPrev={actions.prevStream}
              onNext={actions.nextStream}
            />
          </div>

          <div className="mt-7">
            <AddBar
              onAddTask={() => setModal({ open: true, mode: "task" })}
              onAddBundle={() => setModal({ open: true, mode: "bundle" })}
            />
          </div>

          <button
            onClick={() => setHelp(true)}
            className="text-muted-soft hover:text-cream-soft mt-3 self-center text-[11px] transition-colors"
          >
            press ? for shortcuts
          </button>
        </main>
      </div>

      <AddTaskModal
        open={modal.open}
        mode={modal.mode}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSave={handleSave}
      />
      <StreamManagerModal
        open={manage}
        userName={userName ?? ""}
        streams={streams}
        taskCounts={taskCounts}
        onClose={() => setManage(false)}
        onRenameUser={actions.setUserName}
        onAdd={actions.addStream}
        onRename={actions.renameStream}
        onDelete={actions.deleteStream}
        onReorder={actions.reorderStreams}
        onReplayTour={() => setTour(true)}
      />
      <KeyboardHelp open={help} onClose={() => setHelp(false)} />
      <Tutorial open={tour} onClose={closeTour} />
    </div>
  );
}
