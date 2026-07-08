import { useCallback, useEffect, useState } from "react";
import type { Effort, SawaData, Task, TaskStream } from "../types";
import { store } from "../store/store";
import { dayKey, now, uuid } from "../lib/util";
import { isFailed } from "../lib/ranking";
import { orderedByQueue, reindex } from "../lib/queue";
import { currentStreak } from "../lib/streak";

// Every write goes through the queue engine first, so the persisted `order`
// snapshot is always fresh — at no extra cost, since the store saves the whole
// blob in one shot regardless of how many task orders moved.
function persist(next: SawaData): SawaData {
  const { data } = reindex(next);
  store.save(data);
  return data;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  deadline?: number;
  childTitles?: string[];
  effort?: Effort;
  important?: boolean;
}

/** A switcher entry — a real stream, or the synthetic Failed bin. */
export interface SwitcherView {
  id: string;
  name: string;
  kind: "stream" | "failed";
}

export const FAILED_VIEW_ID = "__failed__";

export function useSawa() {
  const [data, setData] = useState<SawaData>(() => store.load());
  const [streamIndex, setStreamIndex] = useState(0);
  const [, setTick] = useState(0);

  // React to external updates (other tabs today; sync engine later).
  useEffect(() => store.subscribe((incoming) => setData(incoming)), []);

  // App-open: advance the queue snapshot once (deadlines may have crossed
  // boundaries overnight), persisting only if the order actually changed.
  useEffect(() => {
    setData((prev) => {
      const { data, changed } = reindex(prev);
      if (!changed) return prev;
      store.save(data);
      return data;
    });
  }, []);

  // Re-render periodically so tasks fail in real time as deadlines pass.
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const t0 = Date.now();
  const streams = [...data.streams].sort((a, b) => a.order - b.order);
  const failedAll = data.tasks.filter((t) => isFailed(t, t0));

  const views: SwitcherView[] = [
    ...streams.map((s) => ({ id: s.id, name: s.name, kind: "stream" as const })),
    ...(failedAll.length > 0
      ? [{ id: FAILED_VIEW_ID, name: "Failed", kind: "failed" as const }]
      : []),
  ];
  const viewCount = views.length;
  const safeIndex = viewCount
    ? ((streamIndex % viewCount) + viewCount) % viewCount
    : 0;
  const activeView = views[safeIndex];
  const isFailedView = activeView?.kind === "failed";
  const activeStream = !isFailedView
    ? streams.find((s) => s.id === activeView?.id)
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
        tasks: d.tasks.map((task) => {
          if (task.id !== id) return task;
          const t = now();
          // Stamp `postponedAt` so the penalty can decay from this moment.
          return { ...task, postpones: task.postpones + 1, postponedAt: t, updatedAt: t };
        }),
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
          streamId: bundle.streamId,
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

  /** Set (or change) the user's display name; ignores an empty value. */
  const setUserName = useCallback(
    (name: string) =>
      mutate((d) => ({ ...d, userName: name.trim() || d.userName })),
    [mutate],
  );

  const addTask = useCallback(
    (streamId: string, input: NewTaskInput, isBundle = false) =>
      mutate((d) => {
        const t = now();
        const task: Task = {
          id: uuid(),
          streamId,
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          isBundle,
          childTitles: isBundle
            ? (input.childTitles ?? []).map((s) => s.trim()).filter(Boolean)
            : undefined,
          deadline: input.deadline,
          effort: input.effort,
          important: input.important || undefined,
          postpones: 0,
          createdAt: t,
          updatedAt: t,
        };
        return { ...d, tasks: [...d.tasks, task] };
      }),
    [mutate],
  );

  const nextStream = useCallback(
    () => setStreamIndex((i) => (i + 1) % Math.max(viewCount, 1)),
    [viewCount],
  );
  const prevStream = useCallback(
    () => setStreamIndex((i) => (i - 1 + viewCount) % Math.max(viewCount, 1)),
    [viewCount],
  );

  /** Move the active stream earlier (-1) or later (+1), keeping it active. */
  const moveActiveStream = useCallback(
    (dir: -1 | 1) => {
      if (isFailedView) return;
      const idx = safeIndex;
      const swap = idx + dir;
      if (swap < 0 || swap >= streams.length) return;
      const a = streams[idx];
      const b = streams[swap];
      mutate((d) => {
        const t = now();
        return {
          ...d,
          streams: d.streams.map((s) => {
            if (s.id === a.id) return { ...s, order: b.order, updatedAt: t };
            if (s.id === b.id) return { ...s, order: a.order, updatedAt: t };
            return s;
          }),
        };
      });
      setStreamIndex(swap);
    },
    [streams, safeIndex, isFailedView, mutate],
  );

  /**
   * Append a new stream after the last one. Returns the generated id (created
   * here, in the hook layer) so the caller can reference the new stream
   * immediately — e.g. to focus its name field for renaming.
   */
  const addStream = useCallback(
    (name = "New stream"): string => {
      const id = uuid();
      mutate((d) => {
        const t = now();
        const maxOrder = d.streams.reduce((m, s) => Math.max(m, s.order), -1);
        const stream: TaskStream = {
          id,
          name: name.trim() || "New stream",
          order: maxOrder + 1,
          createdAt: t,
          updatedAt: t,
        };
        return { ...d, streams: [...d.streams, stream] };
      });
      return id;
    },
    [mutate],
  );

  const renameStream = useCallback(
    (id: string, name: string) =>
      mutate((d) => ({
        ...d,
        streams: d.streams.map((s) =>
          s.id === id
            ? { ...s, name: name.trim() || s.name, updatedAt: now() }
            : s,
        ),
      })),
    [mutate],
  );

  /** Delete a stream and all its tasks. Refuses to remove the last stream. */
  const deleteStream = useCallback(
    (id: string) =>
      mutate((d) => {
        if (d.streams.length <= 1) return d;
        return {
          ...d,
          streams: d.streams.filter((s) => s.id !== id),
          tasks: d.tasks.filter((t) => t.streamId !== id),
        };
      }),
    [mutate],
  );

  /** Reassign `order` to match the given id sequence (drag-and-drop reorder). */
  const reorderStreams = useCallback(
    (orderedIds: string[]) =>
      mutate((d) => {
        const t = now();
        const rank = new Map(orderedIds.map((id, i) => [id, i]));
        return {
          ...d,
          streams: d.streams.map((s) =>
            rank.has(s.id) ? { ...s, order: rank.get(s.id)!, updatedAt: t } : s,
          ),
        };
      }),
    [mutate],
  );

  // Active list: the Failed bin (most-recently-missed first) or a stream sorted
  // by its materialized queue `order` (the synced snapshot the engine writes).
  const activeTasks: Task[] = isFailedView
    ? [...failedAll].sort((a, b) => (b.deadline ?? 0) - (a.deadline ?? 0))
    : activeStream
      ? orderedByQueue(
          data.tasks.filter(
            (t) =>
              t.streamId === activeStream.id &&
              t.completedAt === undefined &&
              !isFailed(t, t0),
          ),
          t0,
        )
      : [];

  // Counts for the active view.
  const streamTasks = activeStream
    ? data.tasks.filter((t) => t.streamId === activeStream.id)
    : [];
  const today = dayKey();
  const leftCount = isFailedView
    ? failedAll.length
    : streamTasks.filter((t) => t.completedAt === undefined && !isFailed(t, t0))
        .length;
  const failedCount = isFailedView
    ? failedAll.length
    : streamTasks.filter((t) => isFailed(t, t0)).length;
  const completedToday = isFailedView
    ? 0
    : streamTasks.filter(
        (t) => t.completedAt !== undefined && dayKey(t.completedAt) === today,
      ).length;

  const streak = currentStreak(data.completionDays);

  return {
    data,
    userName: data.userName,
    streams,
    views,
    activeStream,
    activeViewName: activeView?.name ?? "—",
    isFailedView,
    viewCount,
    streamIndex: safeIndex,
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
      nextStream,
      prevStream,
      moveActiveStream,
      addStream,
      renameStream,
      deleteStream,
      reorderStreams,
      setUserName,
    },
  };
}
