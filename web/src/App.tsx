import { useEffect, useMemo, useState } from "react";
import { useSawa, type NewTaskInput } from "./hooks/useSawa";
import { InkWash } from "./components/InkWash";
import { TopBar } from "./components/TopBar";
import { CardStack } from "./components/CardStack";
import { StreamSwitcher } from "./components/StreamSwitcher";
import { AddBar } from "./components/AddBar";
import { AddTaskModal } from "./components/AddTaskModal";
import { StreamManagerModal } from "./components/StreamManagerModal";
import { NameModal } from "./components/NameModal";
import { KeyboardHelp } from "./components/KeyboardHelp";
import { resolveAction } from "./lib/keymap";

export default function App() {
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

  // No name stored yet → block the app behind the first-run name prompt.
  const needsName = !userName;
  const overlayOpen = modal.open || help || manage || needsName;
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
      if (modal.open || manage || needsName) return;

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
  }, [modal.open, manage, needsName, prevStream, nextStream, moveActiveStream]);

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
      />
      <KeyboardHelp open={help} onClose={() => setHelp(false)} />
      <NameModal open={needsName} onSave={actions.setUserName} />
    </div>
  );
}
