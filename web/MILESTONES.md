# Sawa — Milestones

A living roadmap for the web app (and the path back to iOS). Ordered roughly by
sequence, since later items depend on earlier ones.

## ✅ M0 — Local web app (done)

- Vite + React + TS + Tailwind v4 + Motion, installable PWA.
- Card-stack UI: swipe right = complete, left = postpone, X = delete.
- Bundles: a parent task that unfolds its (unordered) subtasks into the stack.
- Contexts with bottom switcher; deadline chips; streak + counts.
- Ranking seam (`lib/ranking.ts`) — deadline-driven, no fixed order.
- Storage behind a swappable `Store` interface (local now).

## ✅ M1 — Keyboard-first control (done)

- Full keyboard operation: arrows / D·S to complete·postpone, X to delete,
  `[` `]` for contexts, N / B to add, `?` for the shortcut sheet.
- Card actions reuse the same fly animation as swipe.

## M2 — Cross-device sync (Convex)

- Implement the `Store` interface against Convex; swap the instance in `useSawa`.
- Real-time query subscriptions replace the local snapshot; offline still works
  via the local cache, reconciled on reconnect (ids + `updatedAt` already in place).
- **Why first:** every later feature (Slack, auth, iOS) needs a shared backend.

## M3 — Auth

- Add accounts so sync is per-user. Likely Clerk (first-party Convex + Swift
  integrations) or Better Auth (self-hosted, owns the data).
- Gate sync features behind sign-in; keep a local-only guest mode.

## M4 — Slack integration  ⬅ requested

Depends on M2 (backend) + M3 (auth to link a Slack identity to a Sawa user).

Scope to design:
- **Capture:** a Slack message-action / shortcut ("Send to Sawa") that creates a
  task in a chosen context, carrying a link back to the thread.
- **Slash command:** `/sawa add <title> [!context] [due:...]` to add without leaving Slack.
- **Daily digest:** an optional scheduled DM — "N left today, M due" — and a
  nudge for overdue cards.
- **Complete from Slack:** interactive message buttons to complete / postpone,
  writing straight to Convex.
- **Plumbing:** a Slack app (OAuth + Events API + interactivity), a Convex HTTP
  action to receive webhooks, and a mapping table Slack user ↔ Sawa user.

Open questions: per-context channel routing? Team/shared contexts, or personal only?

## M5 — Polish & motion

- Tune swipe spring + thresholds; refine the unfold animation for bundles.
- Empty-state art; subtle completion flourish (web has no haptics — lean on motion).
- Accessibility pass (focus order, ARIA on the stack, reduced-motion support).

## M6 — Monetization (Pro)

- Soft free tier (e.g. task / context / bundle limits) with a calm, non-pushy
  upgrade. Pro unlocks higher limits + power features (Slack, advanced recurrence).
- Keep entitlements server-side (Convex) so web and iOS share them.

## M7 — iOS app

- New Swift/SwiftUI client against the **same Convex backend** (first-party Swift
  SDK), reusing the data model and ranking rules. Brings back the original
  tripled-sensory feel (animation + haptics + sound) on device.

## M8 — Android app  ⬅ priority after iOS

A first-class **native** Android client — not a stretched SwiftUI build. SwiftUI
does not run on Android, so this is its own client sharing the **backend**, not
UI code (same principle that makes iOS work: Convex is the shared layer, not the
language).

- **Stack:** Kotlin + Jetpack Compose against the **same Convex backend**,
  reusing the data model, ranking rules, and entitlements.
- **Parity target:** the card-stack + swipe feel, contexts, bundles, Failed bin,
  and the tripled-sensory feel (animation + haptics + sound) — matched to
  Android idioms, not copied pixel-for-pixel from iOS.
- **Interim:** the installable **PWA** is already the Android story today; this
  milestone upgrades that to a native app once iOS ships.
- Open question: how much non-UI logic (ranking, sync client) is worth sharing
  cross-platform vs. reimplementing natively per client.

---

### Notes
- Slack work is intentionally parked behind sync + auth; building it before a
  backend would mean throwaway plumbing.
- Android is native (Kotlin/Compose), not Swift: SwiftUI is Apple-only. The
  shared layer across web/iOS/Android is the Convex backend, per the
  "no cross-platform frameworks" rule in CLAUDE.md.
