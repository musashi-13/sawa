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
