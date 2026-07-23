# 沢 Sawa

A calm, card-stack todo for planning your day. Swipe a card right to complete,
left to postpone; whatever you can do *now* floats to the top.

This is a monorepo:

- [`web/`](./web) — the web app (Vite + React + TypeScript + Tailwind + Motion, installable PWA). See [`web/README.md`](./web/README.md) to run it.
- `ios/` — planned Swift/SwiftUI client against the same backend (see [`web/MILESTONES.md`](./web/MILESTONES.md)).

## Quick start (web)

```bash
cd web
npm install
npm run dev
```

## Developer mode (hidden)

Press **`Ctrl` + `Shift` + `Alt` + `D`** anywhere in the app to toggle it
(macOS: `Control` + `Option` + `Shift` + `D`). A toast confirms **on** and
**off**; the setting persists per device and is off by default.

It turns on verbose sync logging in the browser console — auth transitions,
hydration, every pushed **or held** write, and incoming server snapshots — and
attaches a `window.__sawa` handle:

| Call | What it does |
| --- | --- |
| `__sawa.state()` | Sync internals: `authed`, `hydrated`, `writesFlowing`, `seeded` |
| `__sawa.data()` | The local data the UI is currently rendering |
| `__sawa.push()` | Force-push the local cache to the server, bypassing the write gate |
| `__sawa.backend` | Which store is active (`convex` or `local`) |

`writesFlowing: false` means edits are **not** reaching the server — the single
most useful thing to check if syncing looks wrong. The app version is shown in
Settings (next to *Show walkthrough*) to confirm which build is running.
