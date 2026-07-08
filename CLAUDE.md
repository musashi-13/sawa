# CLAUDE.md — Sawa

Context for Claude (and humans) working on this repo. Read this first.

沢 (*sawa*) = a mountain stream, valley, or dale. Sawa is a **card-stack todo**
for planning your day: tasks are cards stacked on top of each other; swipe right
to complete, left to postpone. Whatever you can do *now* floats to the top. The
feel target: minimal but characterful — Craft meets Linear, with a warm,
Japanese / isekai / medieval texture. Not sterile, not childish.

This repo is a **monorepo**:
- `web/` — the current app (Vite + React + TS + Tailwind v4 + Motion, PWA).
- `ios/` — planned Swift/SwiftUI client against the same backend (later).

The web version is being built first, for personal use, as a day planner.

---

## How to run (web)

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build  (also verifies types)
npm run typecheck
```

- Use **Node 22 LTS** (via nvm). Avoid odd/non-LTS Node — it caused a
  `libsimdjson` crash with Homebrew Node once.
- If `npm run build` fails with `Cannot find module '@rollup/rollup-...'`, that's
  the npm optional-deps bug: `rm -rf node_modules package-lock.json && npm install`.

---

## Design language (hold the line on this)

- **Palette (warm, dark, pleasant):** bg `#1E1C1A`, surface `#26231F`, parchment
  card `#EAE3D3` (with a warm gradient), ink text `#2B2722`, clay accent
  `#C96442`, gold (bundles) `#B8915A`, cream text `#E9E2D3`, muted `#8C8270`.
  Defined as Tailwind theme vars in `web/src/index.css`.
- **Cards** are parchment with a subtle paper-grain texture, a soft drop shadow,
  a left accent strip (clay for tasks, gold for bundles, red for failed), and a
  faint 沢 watermark. Titles use a **serif** face (scroll/quest feel).
- **Background** is a faint, low-contrast ink-wash of flowing water (`InkWash`).
- **Motion is first-class**, not an afterthought. Specify spring params, don't
  just "add an animation". Swipe uses spring physics + rotate + a fade that
  scales with drag distance (so long desktop flings dissolve, not just exit).
- Web has **no haptics/sound** (dropped for the web build; they return on iOS).
  So lean entirely on visual motion for feedback.
- Keep it calm and minimal. Generous whitespace. Don't over-decorate.
- Reference art for color/form: The Great Wave off Kanagawa, Fuji from
  Kawaguchi Lake, Alishan Journey Map.

## Core concepts / domain model

- **Task**: title, optional description, optional deadline, `postpones`,
  `completedAt`, plus bundle fields. Every record has a UUID `id` + `updatedAt`
  (sync-ready). See `web/src/types.ts`.
- **Context**: a named stack (Daily / Projects / Errands…), reorderable. Bottom
  switcher cycles between them; a synthetic **Failed** bin appears at the end.
- **Bundle** (束): a parent task. Swiping it right **unfolds** its subtasks into
  the stack as *unordered* cards (no sequencing — that would break "pick what I
  can do now"). Each child is tagged `from <bundle>`.
- **Failed**: when a deadline passes without completion, the task is *failed*
  (derived by `isFailed`), leaves the active stack, and collects in the Failed
  bin. There: swipe **right = revive** (clears the deadline so it returns),
  **left = discard** (delete).
- **Queue engine** (`web/src/lib/queue.ts`): the "what should I do now"
  algorithm — **the seam Karan owns**. `scoreTask` blends EDF deadline pull
  (sharpened by `effort` into least-slack-time), a decaying postpone penalty,
  anti-starvation aging, a WSJF quick-win bias, an Eisenhower `important` boost,
  and a slight bundle demotion. Weights live in `DEFAULT_QUEUE_WEIGHTS`; tune
  freely. `reindex` **materializes** the ranking into a persisted `order` on each
  task (0 = top of its stream) — recomputed on every write (via `persist`) and
  once on app-open, so the stack is a *stable, synced snapshot* rather than
  something that reshuffles live. The UI only reads `order` (`orderedByQueue`),
  never sorts itself. `ranking.ts` now holds just `isFailed` + `urgencyBand`.
- **Streak / counts**: streak = consecutive days with ≥1 completion. The
  "N left · N complete · N failed" line is scoped to the active context.

## Architecture (web)

- **Storage seam** (`web/src/store/store.ts`): everything talks to a `Store`
  interface, never localStorage directly. `LocalStore` persists the whole
  `SawaData` blob under key `sawa.data.vN` (bump the version to reset). To add
  cross-device sync later, implement `Store` against **Convex** and swap the
  instance in `useSawa` — the component tree doesn't change.
- **State/actions**: `web/src/hooks/useSawa.ts` (complete / postpone / delete /
  revive / unfoldBundle / addTask / context nav + reorder).
- **Keymap** (`web/src/lib/keymap.ts`): single source of truth for shortcuts.
  Components resolve keys via `resolveAction`; the help sheet renders from the
  same list. Defaults live in TS (typed, compile-checked). Future user overrides
  → persist as JSON in the `Store`, merged over these defaults.
- **Components**: `CardStack` (stack + swipe + bundle unfold + keyboard),
  `TopBar`, `ContextSwitcher`, `AddBar`, `AddTaskModal`, `KeyboardHelp`,
  `DeadlineChip`, `InkWash`.

### Keyboard shortcuts (see keymap.ts / press `?` in-app)
`D`/`→` complete · unfold · revive — `A`/`←` postpone · discard —
`X`/`⌫` delete — `Q`/`E` prev/next context — `⇧Q`/`⇧E` reorder context —
`Space` open add pane — in the pane `Tab→↵` makes it a bundle, `↵` adds — `?`
help — `Esc` close.

## Conventions

- Production-quality TypeScript, not tutorial code. `async/await` over callbacks.
- Prefer value types / plain data + pure functions; keep side effects in the
  store/hook layer.
- Comment non-obvious decisions, not obvious ones.
- When specifying animations, give easing/spring params (stiffness, damping),
  not just "animate".
- Flag iOS/browser compatibility issues and deprecated APIs proactively.
- Research the most feature-rich *stable* package before adding one; don't grab
  the first result. Don't over-engineer — focused, elegant app, not enterprise.
- No cross-platform frameworks (no React Native); web now, native Swift later.

## Product intent / monetization

- Keep a future **Pro** tier in mind (e.g. higher task/context/bundle limits,
  Slack, advanced recurrence). Never pushy. Entitlements should live server-side
  (Convex) so web + iOS share them.

## Stack decisions (why)

- **Vite + React + TS** (light SPA; no SSR needed for a sync-driven todo).
- **Tailwind v4** via `@tailwindcss/vite`. **Motion** (`motion/react`) for
  animation. **vite-plugin-pwa** for installable/offline.
- **Local storage now** → **Convex** later (TS-native reactive sync + a
  first-party Swift SDK for the future iOS app). **Clerk** for auth later
  (native Convex + Swift integrations). Deploy on **Vercel** (a plain Vite SPA
  deploys fine — Next is NOT required).
- Full rationale + sequencing in `web/MILESTONES.md`.

## Roadmap

See `web/MILESTONES.md`. Order: M2 Convex sync → M3 auth → M4 Slack integration
→ M5 polish → M6 Pro → M7 iOS. Slack is parked behind sync + auth on purpose.

## Working notes

- The named stacks are called **streams** (`TaskStream` / `streamId` in code;
  the term "context" was renamed everywhere). First run seeds **empty** data (no
  sample tasks, streak 0) with 3 default streams (Daily / Projects / Errands).
- Streams are managed from the **Settings sheet** (gear in the TopBar): edit
  display name, add / rename / drag-reorder / delete streams.
- The user's display name is captured by a first-run modal and stored in
  `SawaData.userName`.
- Deadlines are a specific date+time (`datetime-local` in the add pane, stored as
  epoch ms); a task fails once that moment passes. Adjust `isFailed` for a grace
  period if desired.
