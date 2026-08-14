"use client";

export function ScoreTotals({
  us,
  them,
  usLabel = "Us",
  themLabel = "Them",
  // True only on the actual Game Over screen. "Leading" describes an
  // ongoing, undecided comparison — showing it right under a headline
  // that's already declared a winner ("X wins") reads as a stale,
  // redundant label. "Won" says the same visual thing (which side is
  // highlighted) without contradicting the headline.
  gameOver = false,
}: {
  us: number;
  them: number;
  usLabel?: string;
  themLabel?: string;
  gameOver?: boolean;
}) {
  const usLeads = us > them;
  const themLeads = them > us;
  const badgeLabel = gameOver ? "Won" : "Leading";
  // Beta feedback: a long team name ("Kevin & Jon") sharing one row with
  // the Leading/Won badge got truncated to "Kevin &…" — there wasn't
  // enough width for both. The badge moves to its own corner tag so the
  // name gets the card's full width to itself and can wrap to a second
  // line instead of being cut off.
  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className={`relative rounded-card p-4 text-center ${
          usLeads ? "bg-brass-tint ring-2 ring-brass" : "bg-paper-dim"
        }`}
      >
        {usLeads && (
          <span className="absolute right-2 top-2 rounded-full bg-brass px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-ink">
            {badgeLabel}
          </span>
        )}
        <p className="px-5 font-body text-xs uppercase tracking-[0.2em] text-ink/75">{usLabel}</p>
        <div className="font-score tabular-score text-4xl font-bold text-ink">{us}</div>
      </div>
      <div
        className={`relative rounded-card p-4 text-center ${
          themLeads ? "bg-brass-tint ring-2 ring-brass" : "bg-paper-dim"
        }`}
      >
        {themLeads && (
          <span className="absolute right-2 top-2 rounded-full bg-brass px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-ink">
            {badgeLabel}
          </span>
        )}
        <p className="px-5 font-body text-xs uppercase tracking-[0.2em] text-ink/75">{themLabel}</p>
        <div className="font-score tabular-score text-4xl font-bold text-ink">{them}</div>
      </div>
    </div>
  );
}
