import { useCallback, useEffect, useState } from "react";
import type { SawaData, Task } from "../types";
import { store } from "../store/store";
import { dayKey, now, uuid } from "../lib/util";
import { isFailed, rankTasks } from "../lib/ranking";
import { currentStreak } from "../lib/streak";

function persist(next: SawaData): SawaData {
  store.save(next);
  return next;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  deadline?: number;
  childTitles?: string[];
}

/** A switcher entry — a real context, or the synthetic Failed bin. */
export interface SwitcherView {
  id: string;
  name: string;
  kind: "context" | "failed";
}

export const FAILED_VIEW_ID = "__failed__";

export function useSawa() {
  const [data, setData] = useState<SawaData>(() => store.load());
  const [contextIndex, setContextIndex] = useState(0);
  const [, setTick] = useState(0);

  // React to external updates (other tabs today; sync engine later).
  useEffect(() => store.subscribe((incoming) => setData(incoming)), []);

  // Re-render periodically so tasks fail in real time as deadlines pass.
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const t0 = Date.now();
  const contexts = [...data.contexts].sort((a, b) => a.order - b.order);
  const failedAll = data.tasks.filter((t) => isFailed(t, t0));

  const views: SwitcherView[] = [
    ...contexts.map((c) => ({ id: c.id, name: c.name, kind: "context" as const })),
    ...(failedAll.length > 0
      ? [{ id: FAILED_VIEW_ID, name: "Failed", kind: "failed" as const }]
      : []),
  ];
  const viewCount = views.length;
  const safeIndex = viewCount
    ? ((contextIndex % viewCount) + viewCount) % viewCount
    : 0;
  const activeView = views[safeIndex];
  const isFailedView = activeView?.kind === "failed";
  const activeContext = !isFailedView
    ? contexts.find((c) => c.id === activeView?.id)
    : undefined;
  const failedDotIndex = failedAll.length > 0 ? viewCount - 1 : -1;

  const mutate = useCallback(
    (fn: (draft: SawaData) => SawaData) => setData((prev) => persist(fn(prev))),
    [],
  );

  const recordCompletionDay = (d: SawaData): SawaData => {
    const today = dayKey();
    if (d.completionDays.includes(today)) return d;
    return { ...d, completionDays: [...d.completionDays, today].sort() };
  };

  const complete = useCallback(
    (id: string) =>
      mutate((d) => {
        const t = now();
        const tasks = d.tasks.map((task) =>
          task.id === id ? { ...task, completedAt: t, updatedAt: t } : task,
        );
        return recordCompletionDay({ ...d, tasks });
      }),
    [mutate],
  );

  const postpone = useCallback(
    (id: string) =>
      mutate((d) => ({
        ...d,
        tasks: d.tasks.map((task) =>
          task.id === id
            ? { ...task, postpones: task.postpones + 1, updatedAt: now() }
            : task,
        ),
      })),
    [mutate],
  );

  const remove = useCallback(
    (id: string) =>
      mutate((d) => ({ ...d, tasks: d.tasks.filter((task) => task.id !== id) })),
    [mutate],
  );

  /** Bring a failed task back to its stack by clearing its (missed) deadline. */
  const revive = useCallback(
    (id: string) =>
      mutate((d) => ({
        ...d,
        tasks: d.tasks.map((task) =>
          task.id === id
            ? { ...task, deadline: undefined, postpones: 0, updatedAt: now() }
            : task,
        ),
      })),
    [mutate],
  );

  /** Swipe-right on a bundle: scatter its children into the stack, drop the bundle. */
  const unfoldBundle = useCallback(
    (id: string) =>
      mutate((d) => {
        const bundle = d.tasks.find((task) => task.id === id);
        if (!bundle || !bundle.isBundle) return d;
        const t = now();
        const children: Task[] = (bundle.childTitles ?? []).map((title) => ({
          id: uuid(),
          contextId: bundle.contextId,
          title,
          isBundle: false,
          parentTitle: bundle.title,
          deadline: bundle.deadline,
          postpones: 0,
          createdAt: t,
          updatedAt: t,
        }));
        return {
          ...d,
          tasks: [...d.tasks.filter((task) => task.id !== id), ...children],
        };
      }),
    [mutate],
  );

  const addTask = useCallback(
    (contextId: string, input: NewTaskInput, isBundle = false) =>
      mutate((d) => {
        const t = now();
        const task: Task = {
          id: uuid(),
          contextId,
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          isBundle,
          childTitles: isBundle
            ? (input.childTitles ?? []).map((s) => s.trim()).filter(Boolean)
            : undefined,
          deadline: input.deadline,
          postpones: 0,
          createdAt: t,
          updatedAt: t,
        };
        return { ...d, tasks: [...d.tasks, task] };
      }),
    [mutate],
  );

  const nextContext = useCallback(
    () => setContextIndex((i) => (i + 1) % Math.max(viewCount, 1)),
    [viewCount],
  );
  const prevContext = useCallback(
    () => setContextIndex((i) => (i - 1 + viewCount) % Math.max(viewCount, 1)),
    [viewCount],
  );

  /** Move the active context earlier (-1) or later (+1), keeping it active. */
  const moveActiveContext = useCallback(
    (dir: -1 | 1) => {
      if (isFailedView) return;
      const idx = safeIndex;
      const swap = idx + dir;
      if (swap < 0 || swap >= contexts.length) return;
      const a = contexts[idx];
      const b = contexts[swap];
      mutate((d) => {
        const t = now();
        return {
          ...d,
          contexts: d.contexts.map((c) => {
            if (c.id === a.id) return { ...c, order: b.order, updatedAt: t };
            if (c.id === b.id) return { ...c, order: a.order, updatedAt: t };
            return c;
          }),
        };
      });
      setContextIndex(swap);
    },
    [contexts, safeIndex, isFailedView, mutate],
  );

  // Active list: the Failed bin (most-recently-missed first) or a ranked context.
  const activeTasks: Task[] = isFailedView
    ? [...failedAll].sort((a, b) => (b.deadline ?? 0) - (a.deadline ?? 0))
    : activeContext
      ? rankTasks(
          data.tasks.filter(
            (t) =>
              t.contextId === activeContext.id &&
              t.completedAt === undefined &&
              !isFailed(t, t0),
          ),
        )
      : [];

  // Counts for the active view.
  const contextTasks = activeContext
    ? data.tasks.filter((t) => t.contextId === activeContext.id)
    : [];
  const today = dayKey();
  const leftCount = isFailedView
    ? failedAll.length
    : contextTasks.filter((t) => t.completedAt === undefined && !isFailed(t, t0))
        .length;
  const failedCount = isFailedView
    ? failedAll.length
    : contextTasks.filter((t) => isFailed(t, t0)).length;
  const completedToday = isFailedView
    ? 0
    : contextTasks.filter(
        (t) => t.completedAt !== undefined && dayKey(t.completedAt) === today,
      ).length;

  const streak = currentStreak(data.completionDays);

  return {
    data,
    contexts,
    views,
    activeContext,
    activeViewName: activeView?.name ?? "—",
    isFailedView,
    viewCount,
    contextIndex: safeIndex,
    failedDotIndex,
    activeTasks,
    leftCount,
    failedCount,
    completedToday,
    streak,
    actions: {
      complete,
      postpone,
      remove,
      revive,
      unfoldBundle,
      addTask,
      nextContext,
      prevContext,
      moveActiveContext,
    },
  };
}
