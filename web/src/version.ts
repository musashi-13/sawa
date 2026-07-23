// Single source of truth for the app version shown in the UI.
//
// Scheme: BETA . MILESTONES . ITERATION
//   0  — still in beta
//   2  — milestones shipped so far: (1) local app, (2) sync + auth + backend
//   13 — current iteration (bug-fix / change count)
//
// Bump this on every push to main so the number in Settings reflects exactly
// what's deployed — a live "is my change actually running?" check.
export const APP_VERSION = "0.2.16";
