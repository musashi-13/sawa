import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  AuthenticateWithRedirectCallback,
  ClerkProvider,
} from "@clerk/clerk-react";
import App from "./App.tsx";
import { AuthGate } from "./AuthGate.tsx";
import "./index.css";

// When a Clerk key is configured, run the app behind auth (AuthGate). Otherwise
// fall back to the plain, local-only app so a missing key never hard-crashes.
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// OAuth (Google/GitHub) redirects back here — let Clerk finish the handshake.
const isSsoCallback = window.location.pathname === "/sso-callback";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {clerkKey ? (
      <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
        {isSsoCallback ? (
          <AuthenticateWithRedirectCallback signInForceRedirectUrl="/" />
        ) : (
          <AuthGate />
        )}
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);

// ── Keep the app fresh across deploys ────────────────────────────────────────
// The PWA service worker (registerType "autoUpdate") caches the whole app shell,
// so without an active nudge a browser can keep serving a stale build — only a
// hard reload (which bypasses the SW) shows the new one. Two fixes:
//   1. Poll for a new worker on load and periodically, so an update is *found*.
//   2. When a new worker takes control, reload once so the page actually shows
//      the new code — but only on a genuine update (there was a prior
//      controller), never on the first install, to avoid a needless reload.
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    window.location.reload();
  });
  navigator.serviceWorker.ready
    .then((reg) => {
      void reg.update();
      // Every 60s covers long-open tabs / installed PWAs that rarely reload.
      setInterval(() => void reg.update(), 60_000);
    })
    .catch(() => {});
}
