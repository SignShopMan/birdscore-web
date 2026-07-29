// Vercel automatically stamps every deploy with the git commit it was
// built from (VERCEL_GIT_COMMIT_SHA server-side, or
// NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA to reach the client — both are
// injected automatically, no manual env var setup needed on Vercel's
// side). This is deliberately NOT a manually-bumped version number:
// a hardcoded "v1.2.3" I have to remember to update is exactly the kind
// of thing that silently goes stale. A commit SHA can be compared
// directly against `git log -1` to know for certain whether a deploy
// actually matches what was pushed — which is the actual question this
// exists to answer, given how many times "is this actually the latest
// code" has come up.
export const APP_VERSION =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";
