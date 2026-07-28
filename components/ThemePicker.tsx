"use client";

import { useThemeStore, resolveMode, THEME_PALETTE, ThemeAccent, ThemeMode } from "@/lib/theme-store";

const MODE_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

const ACCENT_OPTIONS: { key: ThemeAccent; label: string }[] = [
  { key: "green", label: "Green" },
  { key: "blue", label: "Blue" },
  { key: "mono", label: "Monochrome" },
];

/** No outer card here — SettingsScreen wraps this in a CollapsibleCard titled
 * "Appearance", so this only renders the interactive content. */
export function ThemePicker() {
  const { mode, accent, setMode, setAccent } = useThemeStore();
  // Swatches preview the felt color at whatever mode is actually resolved right
  // now (system resolves to the OS preference), so the preview never lies about
  // what picking it will actually look like.
  const resolved = resolveMode(mode);

  return (
    <div>
      <label className="font-body text-sm font-semibold text-ink">Mode</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {MODE_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            className={`rounded-full px-4 py-1.5 font-body text-sm ${
              mode === key ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-5 block font-body text-sm font-semibold text-ink">Table felt</label>
      <p className="mt-1 font-body text-xs text-ink/75">
        Trump colors always match the physical deck — only the felt changes here.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ACCENT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAccent(key)}
            aria-pressed={accent === key}
            className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 font-body text-sm ${
              accent === key ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
            }`}
          >
            <span
              className="h-5 w-5 shrink-0 rounded-full ring-1 ring-black/15"
              style={{ backgroundColor: THEME_PALETTE[resolved][key] }}
              aria-hidden
            />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
