"use client";

import { ReactNode, useState } from "react";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 text-ink/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = true,
  hasError = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  /** Shows a small warning dot next to the chevron when true and the card is
   * collapsed, so a disabled Save/Start button doesn't look unexplained. */
  hasError?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-card bg-paper shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="min-w-0">
          <span className="block font-body text-sm font-semibold text-ink">{title}</span>
          {subtitle && (
            <span className="mt-1 block font-body text-xs text-ink/60">{subtitle}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {hasError && !open && (
            <span
              className="h-2 w-2 rounded-full bg-trump-red"
              aria-label={`${title} has an issue that needs attention`}
            />
          )}
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
