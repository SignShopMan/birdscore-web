"use client";

import { bidShortcuts } from "@/lib/rook-engine";

export function BidSlider({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const shortcuts = bidShortcuts(max, min);

  return (
    <div className="rounded-card bg-parchment/10 p-4 ring-1 ring-parchment/20">
      <div className="text-center">
        <div className="font-score tabular-score text-5xl font-bold text-parchment">{value}</div>
        <div className="font-body text-[10px] uppercase tracking-wide text-parchment/75">
          range {min}&ndash;{max}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Bid amount"
        className="mt-4 w-full accent-brass disabled:opacity-40"
      />

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {shortcuts.map((v) => (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1 font-score text-xs tabular-score disabled:opacity-40 ${
              value === v
                ? "bg-brass text-ink"
                : "bg-parchment/10 text-parchment ring-1 ring-parchment/30"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
