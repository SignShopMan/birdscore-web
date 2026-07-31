"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function SignInForm() {
  const { sendMagicLink, magicLinkSent } = useAuthStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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
      <p className="font-body text-sm text-ink">
        Check <span className="font-semibold">{email}</span> for a sign-in link.
      </p>
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
