"use client";

const SEAT_LABELS = ["North", "East", "South", "West"];

/**
 * Replaces the old single-tap-cycles-forward dealer button — a QA report
 * flagged that a ~28px target advancing immediately on tap made it too
 * easy to change the dealer by accident, with no undo. This requires two
 * deliberate actions (open the picker, then pick a specific seat) instead
 * of one accidental tap, and shows all 4 seats at once so a misclick
 * doesn't need "undo" at all — you can just tap the right one.
 */
export function DealerPickerModal({
  currentIndex,
  players,
  onSelect,
  onClose,
}: {
  currentIndex: number;
  players: [string, string, string, string] | null;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-sm rounded-t-card bg-paper p-5 shadow-card sm:rounded-card">
        <h2 className="font-display text-lg font-semibold text-ink">Who&rsquo;s dealing?</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {SEAT_LABELS.map((seat, i) => (
            <button
              key={seat}
              onClick={() => {
                onSelect(i);
                onClose();
              }}
              className={`min-h-[64px] rounded-card p-3 text-center ${
                i === currentIndex ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
              }`}
            >
              <div className="font-body text-[11px] uppercase tracking-wide opacity-70">{seat}</div>
              <div className="mt-0.5 truncate font-body text-sm font-semibold">
                {players ? players[i] : `Seat ${i + 1}`}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full min-h-[44px] rounded-full py-2 font-body text-sm font-semibold uppercase tracking-[0.15em] text-ink ring-1 ring-ink/20"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
