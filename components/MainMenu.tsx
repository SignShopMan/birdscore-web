"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

/** The single, consistent navigation entry point — mounted the same way on
 * every screen (Settings, Game, Game Over) rather than each screen having
 * its own bespoke "back to Settings" link. Extensible by design: adding a
 * new destination later is one more row in the sheet, not new UI chrome. */
export function MainMenu({
  onOpenSettings,
  onOpenAccount,
  onOpenFaq,
}: {
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenFaq: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { userId, email } = useAuthStore();

  const go = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-full bg-parchment/10 p-2 text-parchment ring-1 ring-parchment/20"
      >
        <MenuIcon />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="h-full w-72 max-w-[85vw] bg-paper p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-ink">BirdScore</p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-full bg-white px-3 py-1 font-body text-xs text-ink ring-1 ring-ink/15"
              >
                Close
              </button>
            </div>

            <nav className="mt-6 space-y-1">
              <button
                onClick={() => go(onOpenSettings)}
                className="block w-full rounded-md px-3 py-2.5 text-left font-body text-sm font-semibold text-ink hover:bg-paper-dim"
              >
                Settings
              </button>
              <button
                onClick={() => go(onOpenAccount)}
                className="block w-full rounded-md px-3 py-2.5 text-left font-body text-sm font-semibold text-ink hover:bg-paper-dim"
              >
                {userId ? `Account \u00B7 ${email}` : "Account \u00B7 Sign in"}
              </button>
              <button
                onClick={() => go(onOpenFaq)}
                className="block w-full rounded-md px-3 py-2.5 text-left font-body text-sm font-semibold text-ink hover:bg-paper-dim"
              >
                FAQ
              </button>
              <a
                href="mailto:feedback@therealbirdscore.com?subject=BirdScore%20Beta%20Feedback"
                className="block w-full rounded-md px-3 py-2.5 text-left font-body text-sm font-semibold text-ink hover:bg-paper-dim"
              >
                Send Feedback
              </a>
            </nav>

            <p className="mt-6 font-body text-[10px] uppercase tracking-wide text-ink/50">Beta</p>
          </div>
        </div>
      )}
    </>
  );
}
