"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidJoinCodeFormat } from "@/lib/join-code";

/**
 * The missing entry point: /watch/[code] only ever worked if someone
 * clicked a link with the code already embedded in the URL. Anyone who
 * just had the bare code — read aloud, texted as plain text, whatever —
 * had no way to actually use it. This is that way in.
 */
export default function WatchLandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const trimmed = code.trim().toUpperCase();
  const isValid = isValidJoinCodeFormat(trimmed);
  // Only flag as invalid once they've typed the full length — showing an
  // error after every single keystroke on the way there would be noise,
  // not help.
  const showFormatError = trimmed.length === 6 && !isValid;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) router.push(`/watch/${trimmed}`);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center sm:max-w-lg md:max-w-xl">
      <p className="font-body text-xs uppercase tracking-[0.3em] text-brass-text">Watch Live</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-parchment">Enter a game code</h1>
      <p className="mt-2 font-body text-sm text-parchment/75">
        Ask whoever&rsquo;s hosting for their 6-character code — no account needed to watch.
      </p>

      <form onSubmit={submit} className="mt-6 w-full">
        <label htmlFor="watch-code" className="sr-only">
          Game code
        </label>
        <input
          id="watch-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCDEF"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect="off"
          autoFocus
          className="w-full rounded-md border border-parchment/30 bg-white/95 py-4 text-center font-score tabular-score text-3xl font-bold tracking-[0.3em] text-ink"
        />
        {showFormatError && (
          <p className="mt-2 font-body text-xs text-trump-red">
            That doesn&rsquo;t look like a real code — check for typos.
          </p>
        )}
        <button
          type="submit"
          disabled={!isValid}
          className="mt-4 w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink disabled:opacity-40"
        >
          Watch
        </button>
      </form>
    </div>
  );
}
