// A magic-link sign-in means leaving the tab to check email — the in-memory
// game that prompted the save could otherwise be lost the moment that
// happens. This stashes it in localStorage (not the database — the person
// isn't authenticated yet) so ANY tab on this origin can pick it up and
// finish the save once sign-in + payment complete, regardless of whether
// the magic link opened in the original tab or a new one.

const KEY = "birdscore-pending-save";

export interface PendingSave {
  settings: { winningScore: number; maxPointsPerRound: number };
  rounds: unknown[];
  winner: "US" | "THEM" | null;
}

export function stashPendingSave(save: PendingSave) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // localStorage unavailable (private browsing, etc.) — the save prompt
    // still works for anyone already signed in, this only affects the
    // cross-tab handoff for a brand-new sign-in.
  }
}

export function readPendingSave(): PendingSave | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingSave) : null;
  } catch {
    return null;
  }
}

export function clearPendingSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
