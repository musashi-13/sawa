import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth, useClerk, useSignIn, useUser } from "@clerk/clerk-react";
import { Github, History, LogIn, LogOut, UserCircle2 } from "lucide-react";
import App from "./App";
import { SawaStamp } from "./components/SawaStamp";
import { store } from "./store/store";

// Guest-first auth wrapper (only mounted when a Clerk key is configured). The app
// is always usable; signing in is optional and unlocks cross-device sync.
const PROMPT_DISMISSED_KEY = "sawa.signin.dismissed";

export function AuthGate() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(PROMPT_DISMISSED_KEY) === "1",
  );
  const [promptOpen, setPromptOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const autoShown = useRef(false);

  // Bridge the Clerk token into the store so Convex requests are authenticated.
  useEffect(() => {
    const setAuth = store.setAuth?.bind(store);
    if (!isLoaded || !setAuth) return;
    if (isSignedIn) {
      setAuth(({ forceRefreshToken }) =>
        getToken({ template: "convex", skipCache: forceRefreshToken }),
      );
    } else {
      setAuth(null);
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Open the sheet once, on first use, for signed-out visitors.
  useEffect(() => {
    if (isLoaded && !isSignedIn && !dismissed && !autoShown.current) {
      autoShown.current = true;
      setPromptOpen(true);
    }
  }, [isLoaded, isSignedIn, dismissed]);

  const showPrompt = promptOpen && !isSignedIn;

  return (
    <>
      <App
        profileSlot={
          <ProfileControl
            onSignIn={() => setPromptOpen(true)}
            onHistory={() => setHistoryOpen(true)}
          />
        }
        clerkName={isSignedIn ? (user?.firstName ?? undefined) : undefined}
        // Hold the first-run tour until the sign-in sheet is resolved (the user
        // signed in, or dismissed it) so the two overlays don't stack up.
        authPending={!isLoaded || (!isSignedIn && !dismissed)}
        historyOpen={historyOpen}
        onCloseHistory={() => setHistoryOpen(false)}
      />
      <SignInPrompt
        open={showPrompt}
        onClose={() => {
          localStorage.setItem(PROMPT_DISMISSED_KEY, "1");
          setDismissed(true);
          setPromptOpen(false);
        }}
      />
    </>
  );
}

// The profile control keeps the same 沢-app icon whether signed in or out, and
// always opens a small menu: History (for everyone), plus Sign in / Sign out.
function ProfileControl({
  onSignIn,
  onHistory,
}: {
  onSignIn: () => void;
  onHistory: () => void;
}) {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);

  const label = isSignedIn
    ? (user?.primaryEmailAddress?.emailAddress ??
      user?.fullName ??
      user?.firstName ??
      "Signed in")
    : null;

  const item =
    "text-cream-soft hover:bg-bg-soft flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors";

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        title="Menu"
        className={
          isSignedIn
            ? "text-cream-soft flex items-center transition-colors hover:text-cream active:scale-90"
            : "text-muted flex items-center transition-colors hover:text-cream-soft active:scale-90"
        }
      >
        <UserCircle2 size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="border-border-warm absolute right-0 top-8 z-50 w-48 rounded-xl border bg-[#211e1b] p-1.5 shadow-[0_12px_28px_-10px_rgba(0,0,0,0.65)]">
            {label && (
              <div className="text-muted-soft truncate px-2.5 py-1.5 text-[11px]">
                {label}
              </div>
            )}
            <button
              onClick={() => {
                setOpen(false);
                onHistory();
              }}
              className={item}
            >
              <History size={14} /> History
            </button>
            {isSignedIn ? (
              <button
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className={item}
              >
                <LogOut size={14} /> Sign out
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpen(false);
                  onSignIn();
                }}
                className={item}
              >
                <LogIn size={14} /> Sign in
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

interface SignInPromptProps {
  open: boolean;
  onClose: () => void;
}

function SignInPrompt({ open, onClose }: SignInPromptProps) {
  const { isLoaded, signIn } = useSignIn();

  function oauth(strategy: "oauth_google" | "oauth_github") {
    if (!isLoaded || !signIn) return;
    void signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: `${window.location.origin}/sso-callback`,
      redirectUrlComplete: `${window.location.origin}/`,
    });
  }

  const oauthButton =
    "flex w-full items-center justify-center gap-2.5 rounded-full border border-border-warm bg-[#2a2723] py-3 text-[14px] font-medium text-cream-soft transition-all hover:bg-[#332f2a] active:scale-[0.98] disabled:opacity-60";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ background: "rgba(10,9,8,0.6)" }}
        >
          <motion.div
            className="border-border-warm w-full max-w-[400px] rounded-t-3xl border bg-[#211e1b] p-6 sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3.5">
                <SawaStamp size={54} />
              </div>
              <h2 className="text-cream font-serif text-[21px] font-medium">
                Keep your streams flowing
              </h2>
              <p className="text-muted-soft mt-2 text-[13px] leading-[1.55]">
                Sign in to sync your streams and streak across every device, or
                keep them on just this one. You can sign in any time.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => oauth("oauth_google")}
                disabled={!isLoaded}
                className={oauthButton}
              >
                <GoogleMark /> Continue with Google
              </button>
              <button
                onClick={() => oauth("oauth_github")}
                disabled={!isLoaded}
                className={oauthButton}
              >
                <Github size={18} className="text-cream-soft" /> Continue with
                GitHub
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-muted hover:text-cream-soft mt-3.5 w-full py-1.5 text-[13px] transition-colors"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
