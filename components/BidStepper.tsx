"use client";

export function BidStepper({
  value,
  min,
  max,
  step = 5,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div className="flex items-center gap-3 rounded-card bg-parchment/10 p-3 ring-1 ring-parchment/20">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Decrease bid by 5"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-parchment/10 text-2xl font-bold leading-none text-parchment ring-1 ring-parchment/30 disabled:opacity-30"
      >
        &minus;
      </button>

      <div className="flex-1 text-center">
        <div className="font-score tabular-score text-5xl font-bold text-parchment">{value}</div>
        <div className="font-body text-[10px] uppercase tracking-wide text-parchment/50">
          {min}&ndash;{max}
        </div>
      </div>

      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Increase bid by 5"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-parchment/10 text-2xl font-bold leading-none text-parchment ring-1 ring-parchment/30 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
