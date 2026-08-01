"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function SignInForm() {
  const { sendMagicLink, verifyOtpCode, magicLinkSent } = useAuthStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <p className="rounded-md bg-white p-2 font-body text-xs text-trump-red">
        Sign-in isn&rsquo;t set up in this environment yet — Supabase isn&rsquo;t
        configured. See <code>.env.local.example</code>.
      </p>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="space-y-3">
        <p className="font-body text-sm text-ink">
          Check <span className="font-semibold">{email}</span> for a sign-in link
          or a 6-digit code.
        </p>

        {/* The actual fix for signing in from an installed PWA — tapping the
            link opens Safari, a completely separate storage context from the
            standalone app on iOS, so the link alone leaves a PWA user signed
            into the wrong place. Typing the code here never leaves the app. */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setVerifying(true);
            setCodeError(null);
            const { error } = await verifyOtpCode(email, code);
            setVerifying(false);
            if (error) setCodeError(error);
          }}
          className="rounded-md bg-paper-dim p-3"
        >
          <label htmlFor="signin-code" className="font-body text-xs font-semibold text-ink/70">
            Or enter the code here
          </label>
          <p className="mt-0.5 font-body text-[11px] text-ink/60">
            Opened this from your home screen? Use the code, not the link — the link
            signs you into your browser instead of the app you launched.
          </p>
          <input
            id="signin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="mt-2 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-center font-score tabular-score text-lg tracking-[0.2em] text-ink"
          />
          {codeError && <p className="mt-1 font-body text-xs text-trump-red">{codeError}</p>}
          <button
            type="submit"
            disabled={verifying || code.trim().length === 0}
            className="mt-2 w-full rounded-full bg-ink py-2 font-body text-sm font-semibold text-paper disabled:opacity-50"
          >
            {verifying ? "Checking\u2026" : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        const { error } = await sendMagicLink(email);
        setSending(false);
        if (error) setError(error);
      }}
      className="space-y-2"
    >
      <label htmlFor="signin-email" className="sr-only">
        Email address
      </label>
      <input
        id="signin-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-sm text-ink"
      />
      {error && <p className="font-body text-xs text-trump-red">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-full bg-ink py-2 font-body text-sm font-semibold text-paper disabled:opacity-50"
      >
        {sending ? "Sending\u2026" : "Email me a sign-in link"}
      </button>
      <p className="font-body text-[10px] text-ink/50">
        By continuing, you agree to our{" "}
        <a href="/terms" className="underline underline-offset-2">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
