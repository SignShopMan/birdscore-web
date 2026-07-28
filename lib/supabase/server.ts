import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-side equivalent of client.ts — for Route Handlers and Server
 * Components. Same on-demand-only principle: never called by anything on
 * the free-tier play path. */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component without a response to write to —
            // safe to ignore as long as middleware.ts is also refreshing the
            // session (it is, see /middleware.ts).
          }
        },
      },
    }
  );
}
