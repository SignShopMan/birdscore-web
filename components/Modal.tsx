"use client";

import { useEffect, useRef } from "react";

/**
 * Shared shell for every full-screen modal in the app — bottom sheet on
 * mobile, centered on desktop; all 6 modals that used to each write their
 * own copy of this backdrop already used the exact same classes
 * independently. Adds the dialog semantics none of them had: role and
 * aria-modal so a screen reader knows the page behind it is inert, focus
 * moved onto the dialog on open instead of staying wherever it was, and
 * Escape closes it — none of that existed anywhere in the app before,
 * including on ScorecardModal, opened every single round.
 *
 * `panelClassName` carries each modal's own panel sizing/spacing (they
 * differ — max-w-sm vs max-w-md, extra padding, etc.) since the element
 * receiving role="dialog" needs to be the actual visible panel, not an
 * extra wrapper around it.
 */
export function Modal({
  onClose,
  labelledBy,
  panelClassName,
  backdropClassName = "",
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  panelClassName: string;
  backdropClassName?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ScorecardModal's number input uses autoFocus, which the browser
    // applies during commit, before this effect runs — don't steal that
    // focus away. Only take it ourselves if nothing inside the panel
    // already has it.
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      // Bottom-sheet on mobile (items-end) — pb here keeps the panel clear
      // of the home indicator's unsafe zone without every modal needing
      // to know that itself; harmless on desktop/browsers, where
      // safe-area-inset-bottom is just 0.
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-[env(safe-area-inset-bottom)] sm:items-center sm:pb-0 ${backdropClassName}`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
