// Short, shareable codes for realtime games. Alphabet deliberately excludes
// visually-ambiguous characters (0/O, 1/I/L) since these get read aloud and
// typed by hand at a card table, not copy-pasted.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function joinCodeChannel(code: string): string {
  return `game:${code}`;
}

/** Rejects anything that isn't shaped like a real code (wrong length, or
 * characters outside the actual alphabet — including the excluded
 * ambiguous ones and punctuation) before it ever reaches the network. A
 * QA report found that typing "!!!!!!" into the watch page produced a
 * "Connected" state — this is the format half of the fix; the existence
 * half (does a real game actually use this code) needs an actual lookup,
 * which this alone can't tell you. */
export function isValidJoinCodeFormat(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 6) return false;
  return [...normalized].every((c) => ALPHABET.includes(c));
}
