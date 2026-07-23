# 沢 Sawa — web

A calm, card-stack todo for planning your day. Swipe a card right to complete,
left to postpone; whatever you can do *now* floats to the top.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Motion (`motion/react`) for swipe physics + spring animations
- `vite-plugin-pwa` for installable / offline support
- Local storage now, behind a swappable `Store` interface (Convex drops in later)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run typecheck`.

## Install as an app (PWA)

The app is installable on your phone and desktop. Installability needs HTTPS,
which you get automatically on Vercel (and on `localhost` for testing).

- **iPhone (Safari):** open the site → Share → *Add to Home Screen*.
- **Android (Chrome):** open the site → menu → *Install app* / *Add to Home screen*.
- **Desktop (Chrome/Edge):** an install icon appears in the address bar.

Once installed it launches fullscreen, works offline, and updates itself
silently (`registerType: "autoUpdate"`).

## Project map

```
src/
  types.ts              Domain model (Task, Context, Bundle) — sync-ready (ids + updatedAt)
  store/
    store.ts            Store interface + LocalStore (swap for Convex later)
    seed.ts             First-run sample data
  lib/
    ranking.ts          "What should I do now" algorithm — the seam you own
    streak.ts           Consecutive-day streak
    util.ts             ids, day keys, deadline math
  hooks/useSawa.ts      State + all mutations (complete / postpone / unfold / add)
  components/
    CardStack.tsx       The stack, swipe physics, bundle unfolding
    TaskCard...         Top bar, deadline chip, context switcher, add bar, modal
    InkWash.tsx         Faint Fuji + stream background
```

## Where the day-planning logic lives

`src/lib/queue.ts` decides stack order. `scoreTask` blends deadline urgency
(sharpened by effort into least-slack-time), a decaying postpone penalty,
anti-starvation aging, a quick-win bias, an importance boost, and a slight
bundle demotion — no manually fixed ordering. Tune `DEFAULT_QUEUE_WEIGHTS` to
change how aggressively each signal surfaces. `reindex` writes the result into a
persisted, synced `order` on each task; the UI only reads `order`
(`orderedByQueue`), so you can rewrite the scoring freely.

## Developer mode (hidden)

**`Ctrl` + `Shift` + `Alt` + `D`** toggles it from anywhere in the app (macOS:
`Control` + `Option` + `Shift` + `D`). Three modifiers so it can't be hit by
accident, and it dodges every browser binding — `Ctrl+Shift+I/J/C/K` (devtools),
`+D` (bookmark all tabs), `+P` (private window), `+N` (incognito), `+T` (reopen
tab). Matched on `event.code`, so it still works on macOS where `Option+D`
reports `∂`. A toast confirms both on and off; the choice persists per device.

Defined in `src/lib/devMode.ts` (`isDevModeChord`, `toggleDevMode`, `devLog`).
It logs the sync layer's behaviour to the console and attaches `window.__sawa`:

| Call | What it does |
| --- | --- |
| `__sawa.state()` | `authed`, `hydrated`, `writesFlowing`, `seeded`, cache summary |
| `__sawa.data()` | The local data the UI is currently rendering |
| `__sawa.push()` | Force-push the local cache, bypassing the hydration gate |
| `__sawa.backend` | `convex` or `local` |

The logs to watch: `push → server` / `push ok` (a write synced), `write HELD`
(a write was **not** sent — the account hadn't loaded), `server snapshot
received (overwrites local)`, and `hydration: …`. `writesFlowing: false` is the
first thing to check when syncing looks broken.

## Moving to cross-device sync later

Everything talks to the `Store` interface in `src/store/store.ts`. To sync
across devices, implement that interface against Convex (whose `subscribe`
pushes server updates) and swap the instance in `useSawa`. The component tree
doesn't change. Convex also has a first-party Swift SDK for the future iOS app
against the same backend.
