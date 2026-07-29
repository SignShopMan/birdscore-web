"use client";

import { useEffect, useRef, useState } from "react";
import { bidShortcuts } from "@/lib/rook-engine";

/** Clamps to [min, max] and snaps to the nearest step of 5 — shared by both
 * the mobile tap-to-edit input and the stepper buttons. */
function clampToStep(raw: number, min: number, max: number): number {
  const snapped = Math.round(raw / 5) * 5;
  return Math.min(max, Math.max(min, snapped));
}

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = () => {
    const parsed = Number(draft.replace(/[^\d-]/g, ""));
    if (Number.isFinite(parsed)) onChange(clampToStep(parsed, min, max));
    setEditing(false);
  };

  return (
    <div className="rounded-card bg-parchment/10 p-4 ring-1 ring-parchment/20">
      {/* Desktop: dragging with a mouse is precise, so the slider stays the
          primary control here. Mobile: dragging a thin track with a
          fingertip across a 40+ position range is the opposite of precise —
          tap-to-edit + a stepper replaces it below instead. */}
      <div className="hidden lg:block">
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
      </div>

      <div className="lg:hidden">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Decrease bid by 5"
            disabled={disabled || value <= min}
            onClick={() => onChange(clampToStep(value - 5, min, max))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-parchment/10 text-2xl font-bold leading-none text-parchment ring-1 ring-parchment/30 disabled:opacity-30"
          >
            &minus;
          </button>

          <div className="text-center">
            {editing ? (
              <input
                ref={inputRef}
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="w-28 rounded-md border border-parchment/40 bg-white/95 py-1 text-center font-score tabular-score text-4xl font-bold text-ink"
              />
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setEditing(true)}
                aria-label="Tap to enter bid directly"
                className="font-score tabular-score text-5xl font-bold text-parchment underline decoration-parchment/40 decoration-dashed underline-offset-8 disabled:opacity-40"
              >
                {value}
              </button>
            )}
            <div className="mt-1 font-body text-[10px] uppercase tracking-wide text-parchment/75">
              tap to type &middot; {min}&ndash;{max}
            </div>
          </div>

          <button
            type="button"
            aria-label="Increase bid by 5"
            disabled={disabled || value >= max}
            onClick={() => onChange(clampToStep(value + 5, min, max))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-parchment/10 text-2xl font-bold leading-none text-parchment ring-1 ring-parchment/30 disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

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
