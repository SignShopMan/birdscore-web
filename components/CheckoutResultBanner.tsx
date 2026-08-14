"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Stripe redirects back to /?checkout=success or /?checkout=cancelled
 * (see app/api/checkout/route.ts) — neither was ever read anywhere, so
 * someone completing a real payment landed back on the app with zero
 * confirmation anything happened. Also forces a fresh profile fetch on
 * success: the client's cached tier otherwise wouldn't reflect the
 * webhook's write to Supabase until the next unrelated auth-state change,
 * so without this, "did it actually work" had no fast answer either.
 */
export function CheckoutResultBanner() {
  const [result, setResult] = useState<"success" | "cancelled" | null>(null);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "cancelled") {
      setResult(checkout);
      if (checkout === "success") refreshProfile();
      // Strip the param so a reload doesn't re-show the banner.
      params.delete("checkout");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 6000);
    return () => clearTimeout(timer);
  }, [result]);

  if (!result) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div
        className={`rounded-full px-4 py-2.5 text-center font-body text-xs font-semibold shadow-lg ${
          result === "success" ? "bg-trump-green text-white" : "bg-ink text-paper"
        }`}
      >
        {result === "success"
          ? "You're all set — thanks for upgrading!"
          : "Checkout cancelled — no charge made."}
      </div>
    </div>
  );
}
