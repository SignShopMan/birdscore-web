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
