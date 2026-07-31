export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-parchment">
        That page isn&rsquo;t here
      </h1>
      <p className="mt-2 font-body text-sm text-parchment/75">
        The link might be old, or the address might have a typo.
      </p>
      <a
        href="/"
        className="mt-6 rounded-full bg-brass px-6 py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink"
      >
        Back to BirdScore
      </a>
    </div>
  );
}
