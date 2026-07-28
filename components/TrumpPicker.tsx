"use client";

import { TRUMP_OPTIONS, TrumpColor } from "@/lib/rook-engine";

const SWATCH: Record<TrumpColor, { bg: string; text: string; ring: string }> = {
  Black: { bg: "bg-trump-black", text: "text-parchment", ring: "ring-parchment/70" },
  Green: { bg: "bg-trump-green", text: "text-parchment", ring: "ring-parchment/70" },
  Red: { bg: "bg-trump-red", text: "text-parchment", ring: "ring-parchment/70" },
  Yellow: { bg: "bg-trump-yellow", text: "text-ink", ring: "ring-ink/70" },
};

export function TrumpPicker({
  value,
  onChange,
  disabled,
}: {
  value: TrumpColor | null;
  onChange: (t: TrumpColor) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TRUMP_OPTIONS.map(({ key, label }) => {
        const swatch = SWATCH[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            aria-pressed={selected}
            className={`relative aspect-[5/7] rounded-lg ${swatch.bg} ${swatch.text} shadow-card
              transition-transform disabled:opacity-40 disabled:cursor-not-allowed
              ${selected ? `ring-4 ${swatch.ring} scale-[1.03]` : "ring-1 ring-black/20"}`}
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
