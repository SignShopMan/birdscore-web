"use client";

import { TRUMP_OPTIONS, TrumpColor } from "@/lib/rook-engine";

const SWATCH: Record<TrumpColor, { bg: string; text: string; hex: string }> = {
  // Pure white here, not the cream "paper" token — on trump-green specifically,
  // paper only cleared AA by 0.10 (4.60 vs 4.5 needed); white gives 5.29, real
  // margin instead of a razor's edge. See scripts/verify-contrast.ts.
  Black: { bg: "bg-trump-black", text: "text-white", hex: "#1A1A1A" },
  Green: { bg: "bg-trump-green", text: "text-white", hex: "#2F7A3D" },
  Red: { bg: "bg-trump-red", text: "text-white", hex: "#B23A32" },
  Yellow: { bg: "bg-trump-yellow", text: "text-ink", hex: "#E3B23C" },
};

export function TrumpPicker({
  value,
  bidValue,
  onChange,
  disabled,
}: {
  value: TrumpColor | null;
  /** The current bid (or shoot-the-moon max) — shown prominently once trump is called,
   * since this combined card is what the whole table glances at during the round. */
  bidValue: number;
  onChange: (t: TrumpColor) => void;
  disabled?: boolean;
}) {
  // Once trump is called, the 4-color picker collapses into a single card carrying
  // both the trump color and the bid — that's the one thing everyone at the table
  // needs to be able to read at a glance for the rest of the round.
  if (value) {
    const swatch = SWATCH[value];
    return (
      <div
        className={`rounded-card p-8 text-center shadow-card sm:p-10 ${swatch.bg} ${swatch.text}`}
        aria-live="polite"
      >
        <div className="font-body text-sm uppercase tracking-[0.3em]">{value} Trump</div>
        <div className="mt-2 font-score tabular-score text-8xl font-bold leading-none sm:text-9xl">
          {bidValue}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TRUMP_OPTIONS.map(({ key, label }) => {
        const swatch = SWATCH[key];
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            aria-pressed={false}
            className={`relative aspect-[5/7] rounded-lg ${swatch.bg} ${swatch.text} shadow-card
              transition-transform disabled:opacity-40 disabled:cursor-not-allowed ring-1 ring-black/20`}
          >
            <span className="absolute top-2 left-2 text-2xl font-display font-semibold">R</span>
            <span className="absolute bottom-2 right-2 text-2xl font-display font-semibold rotate-180">
              R
            </span>
            <span className="absolute inset-0 flex items-center justify-center font-body text-sm tracking-wide uppercase">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
