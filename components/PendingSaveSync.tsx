"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { canSaveHistory } from "@/lib/entitlements";
import { readPendingSave, clearPendingSave } from "@/lib/pending-save";

/** Mounted globally. Whenever the signed-in tier changes to something that
 * can save history, checks for a stashed pending save (from before sign-in
 * sent someone to their email) and completes it — in whichever tab notices
 * first, since localStorage is shared across tabs on this origin. */
export function PendingSaveSync() {
  const { userId, tier } = useAuthStore();
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!userId || !canSaveHistory(tier) || submittingRef.current) return;
    const pending = readPendingSave();
    if (!pending) return;

    submittingRef.current = true;
    fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    })
      .then(() => clearPendingSave())
      .finally(() => {
        submittingRef.current = false;
      });
  }, [userId, tier]);

  return null;
}
