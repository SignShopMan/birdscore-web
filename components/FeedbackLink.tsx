"use client";

export function FeedbackLink() {
  return (
    <a
      href="mailto:feedback@therealbirdscore.com?subject=BirdScore%20Beta%20Feedback"
      className="fixed bottom-3 right-3 z-30 rounded-full bg-parchment/10 px-3 py-1.5 font-body text-[11px] text-parchment/75 ring-1 ring-parchment/20 backdrop-blur transition hover:bg-parchment/20 hover:text-parchment"
    >
      Beta &middot; send feedback
    </a>
  );
}
