/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // A QA report flagged these as entirely absent. CSP specifically is
    // the one header here that's genuinely risky to get exactly right
    // without a real browser to check console violations in — this
    // sandbox can't load the real Supabase/Stripe endpoints to verify
    // nothing's being silently blocked. Scoped as tightly as I can
    // reason through from the code (Supabase REST + Realtime WebSocket,
    // Stripe Checkout's redirect, Next.js's own inline theme-init
    // script), but this is the one item in this batch that genuinely
    // needs a live check — watch the browser console after deploying
    // for any "Refused to..." CSP errors, particularly around sign-in,
    // realtime, and checkout.
    // next dev's Fast Refresh relies on eval() for its bundle, which a
    // strict script-src blocks outright — crashes hydration on every load
    // (blank page, no console guidance beyond an EvalError). Production
    // builds don't eval() the same way, so this stays scoped to dev only.
    const isDev = process.env.NODE_ENV === "development";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-src https://checkout.stripe.com",
      // 'none' broke the iOS app wrapper entirely: Capacitor's WKWebView
      // identifies its own bridge context as capacitor://localhost even in
      // remote server.url mode, and WebKit's frame-ancestors enforcement
      // treated the wrapper's top-level navigation as framing this page —
      // failed with WebKitErrorDomain 102 (frame load interrupted), which
      // then fell back to opening the URL in the system browser instead.
      // capacitor://localhost isn't a reachable origin on the open web, so
      // allowlisting it here doesn't weaken clickjacking protection for
      // actual browser traffic.
      "frame-ancestors 'self' capacitor://localhost",
      "form-action 'self' https://checkout.stripe.com",
      "base-uri 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
