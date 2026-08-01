"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "birdscore-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * There's no app store listing (maybe never will be), so this banner is
 * the entire onboarding path from "found the website" to "has it on their
 * home screen" — without it, nothing in the app ever tells a first-time
 * visitor that installing is even possible. iOS and Android genuinely
 * need different UI here, not just different copy: iOS has no
 * programmatic install trigger at all (Apple only exposes it through the
 * Share sheet), while Android/Chrome-family browsers fire a real
 * beforeinstallprompt event this can hook a one-tap Install button to.
 */
export function InstallPrompt() {
  const [platform, setPlatform] = useState<"none" | "ios" | "android">("none");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // default hidden until checked, avoids a flash

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return; // already installed — nothing to prompt

    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setPlatform("ios");
      setDismissed(false);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDismissed(true);
  };

  if (dismissed || platform === "none") return null;

  return (
    <div className="rounded-card bg-brass/20 p-3 ring-1 ring-brass/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-wide text-parchment">
            Add BirdScore to your home screen
          </p>
          <p className="mt-1 font-body text-xs text-parchment/75">
            {platform === "ios"
              ? "Tap the Share button below, then \u201cAdd to Home Screen.\u201d Opens full-screen, no browser bar, works offline for scoring."
              : "One tap — opens full-screen, no browser bar, works offline for scoring."}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 font-body text-xs text-parchment/60"
        >
          &times;
        </button>
      </div>
      {platform === "android" && (
        <button
          onClick={install}
          className="mt-2 w-full rounded-full bg-brass py-2 font-body text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Install
        </button>
      )}
    </div>
  );
}
