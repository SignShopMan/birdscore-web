"use client";

import { useThemeStore, ThemeAccent, ThemeMode } from "@/lib/theme-store";

const MODE_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

// Preview swatches are hardcoded to each accent's dark-felt shade, independent
// of whatever theme is currently active — they're previews of the choice, not
// reflections of the current state.
const ACCENT_OPTIONS: { key: ThemeAccent; label: string; swatch: string }[] = [
  { key: "green", label: "Green", swatch: "#173C31" },
  { key: "blue", label: "Blue", swatch: "#15324A" },
  { key: "mono", label: "Monochrome", swatch: "#2B2B2A" },
];

export function ThemePicker() {
  const { mode, accent, setMode, setAccent } = useThemeStore();

  return (
    <div className="rounded-card bg-paper p-4 shadow-card">
      <label className="font-body text-sm font-semibold text-ink">Appearance</label>
      <p className="mt-1 font-body text-xs text-ink/60">Light, dark, or match your device.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MODE_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            className={`rounded-full px-4 py-1.5 font-body text-sm ${
              mode === key ? "bg-ink text-parchment" : "bg-white text-ink ring-1 ring-ink/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-5 block font-body text-sm font-semibold text-ink">Table felt</label>
      <p className="mt-1 font-body text-xs text-ink/60">
        Trump colors always match the physical deck, so only the felt and scorepad
        theme change here.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACCENT_OPTIONS.map(({ key, label, swatch }) => (
          <button
            key={key}
            onClick={() => setAccent(key)}
            aria-pressed={accent === key}
            className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 font-body text-sm ${
              accent === key ? "bg-ink text-parchment" : "bg-white text-ink ring-1 ring-ink/20"
            }`}
          >
            <span
              className="h-5 w-5 shrink-0 rounded-full ring-1 ring-black/15"
              style={{ backgroundColor: swatch }}
              aria-hidden
            />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
