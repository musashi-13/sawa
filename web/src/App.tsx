import { useEffect, useState } from "react";
import { useSawa, type NewTaskInput } from "./hooks/useSawa";
import { InkWash } from "./components/InkWash";
import { TopBar } from "./components/TopBar";
import { CardStack } from "./components/CardStack";
import { ContextSwitcher } from "./components/ContextSwitcher";
import { AddBar } from "./components/AddBar";
import { AddTaskModal } from "./components/AddTaskModal";
import { KeyboardHelp } from "./components/KeyboardHelp";
import { resolveAction } from "./lib/keymap";

const USER_NAME = "Karan";

export default function App() {
  const {
    contexts,
    activeContext,
    activeViewName,
    isFailedView,
    viewCount,
    contextIndex,
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

  const overlayOpen = modal.open || help;
  const { nextContext, prevContext, moveActiveContext } = actions;

  // App-level shortcuts. Card actions (complete/postpone/delete) live in CardStack.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const action = resolveAction(e);
      if (action === "close") {
        setModal((m) => ({ ...m, open: false }));
        setHelp(false);
        return;
      }
      if (modal.open) return;

      switch (action) {
        case "addTask": // let a focused button handle its own Space
          if (tag === "button") return;
          e.preventDefault();
          setModal({ open: true, mode: "task" });
          break;
        case "prevContext":
          prevContext();
          break;
        case "nextContext":
          nextContext();
          break;
        case "moveContextEarlier":
          moveActiveContext(-1);
          break;
        case "moveContextLater":
          moveActiveContext(1);
          break;
        case "toggleHelp":
          setHelp((h) => !h);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.open, prevContext, nextContext, moveActiveContext]);

  function handleSave(input: NewTaskInput, isBundle: boolean) {
    const targetId = activeContext?.id ?? contexts[0]?.id;
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
            name={USER_NAME}
            streak={streak}
            leftCount={leftCount}
            completedToday={completedToday}
            failedCount={failedCount}
            failedView={isFailedView}
          />

          <div className="mt-7 flex flex-col gap-6">
            <CardStack
              tasks={activeTasks}
              mode={isFailedView ? "failed" : "stack"}
              keyboardEnabled={!overlayOpen}
              onComplete={isFailedView ? actions.revive : actions.complete}
              onPostpone={isFailedView ? noop : actions.postpone}
              onUnfold={isFailedView ? actions.revive : actions.unfoldBundle}
              onDelete={actions.remove}
            />

            <ContextSwitcher
              name={activeViewName}
              count={viewCount}
              index={contextIndex}
              failedDotIndex={failedDotIndex}
              onPrev={actions.prevContext}
              onNext={actions.nextContext}
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
      <KeyboardHelp open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
