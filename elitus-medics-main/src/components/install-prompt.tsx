import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "elitus_install_dismissed_at";
const DISMISS_DAYS = 7;

function recentlyDismissed() {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(DISMISS_KEY);
  if (!v) return false;
  const ageMs = Date.now() - Number(v);
  return ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS doesn't fire beforeinstallprompt — show the manual hint after a short delay
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS()) {
      iosTimer = setTimeout(() => {
        setShowIOS(true);
        setOpen(true);
      }, 4000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <AnimatePresence>
      {open && (deferred || showIOS) && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "tween", duration: 0.22 }}
          className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:right-6 md:left-auto md:mx-0"
          role="dialog"
          aria-label="Install ELITUS MEDICS U25"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold border border-[color-mix(in_oklch,var(--gold)_30%,transparent)]">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Install ELITUS U25</p>
              {showIOS && !deferred ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share, then
                  <span className="font-medium text-foreground"> "Add to Home Screen"</span> for the full app.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Add it to your home screen for faster access and an app-like feel.
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                {deferred && (
                  <button
                    onClick={install}
                    className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-[var(--gold-foreground)] transition hover:brightness-110"
                  >
                    Install
                  </button>
                )}
                <button
                  onClick={dismiss}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
