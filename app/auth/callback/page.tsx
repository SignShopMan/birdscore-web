"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * The page a magic-link email actually points to now — deliberately does
 * NOT exchange the code automatically on load. Some mail providers and
 * security scanners prefetch links inside emails before a human clicks
 * them; since the sign-in token is single-use, that prefetch silently
 * burns it, and the real click later just fails with nothing visible to
 * explain why (Supabase's own docs name this as a known issue). Requiring
 * an actual button press means a scanner visiting this URL doesn't
 * consume anything — only a real click calls the exchange API.
 */
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirm = async () => {
    if (!code) return;
    setStatus("working");
    try {
      const res = await fetch("/api/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(next);
      } else {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't reach the server");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">Sign In</p>

      {!code && (
        <>
          <h1 className="mt-2 font-display text-2xl font-semibold text-parchment">
            No sign-in code found
          </h1>
          <p className="mt-2 font-body text-sm text-parchment/75">
            Use the link from your email directly, rather than navigating here on its own.
          </p>
        </>
      )}

      {code && status !== "error" && (
        <>
          <h1 className="mt-2 font-display text-2xl font-semibold text-parchment">
            Finish signing in
          </h1>
          <p className="mt-2 font-body text-sm text-parchment/75">
            Tap below to complete sign-in on this device.
          </p>
          <button
            onClick={confirm}
            disabled={status === "working"}
            className="mt-6 w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink disabled:opacity-50"
          >
            {status === "working" ? "Signing you in\u2026" : "Complete Sign In"}
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="mt-2 font-display text-2xl font-semibold text-parchment">
            Couldn&rsquo;t sign you in
          </h1>
          <p className="mt-2 font-body text-sm text-parchment/75">
            {errorMessage?.toLowerCase().includes("expired") ||
            errorMessage?.toLowerCase().includes("invalid")
              ? "This link has expired or was already used — request a fresh one from the menu."
              : errorMessage}
          </p>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-felt" />}>
      <CallbackInner />
    </Suspense>
  );
}
