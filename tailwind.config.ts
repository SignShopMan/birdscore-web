import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-reactive: table felt and on-felt text/chrome. Values come from
        // CSS custom properties set per data-mode/data-accent combo (globals.css),
        // so switching themes needs no rebuild — see lib/theme-store.ts.
        felt: {
          DEFAULT: "rgb(var(--felt) / <alpha-value>)",
          dark: "rgb(var(--felt-dark) / <alpha-value>)",
        },
        parchment: {
          DEFAULT: "rgb(var(--parchment) / <alpha-value>)",
        },
        // Constant across every theme: the literal scorepad paper surface.
        // A physical paper scorepad doesn't change color with room lighting,
        // and keeping it constant anchors the design across all theme choices.
        paper: {
          DEFAULT: "#F5EFDE",
          dim: "#EAE1C8",
        },
        // Constant: text on the paper surfaces above — always dark-on-cream.
        ink: "#1B2A3A",
        brass: {
          DEFAULT: "#C9A227",
          light: "#E4C560",
        },
        // Constant across every theme — these must match the physical Rook
        // deck's printed colors, so they're not a themeable choice.
        trump: {
          black: "#1A1A1A",
          green: "#2F7A3D",
          red: "#B23A32",
          yellow: "#E3B23C",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        score: ["var(--font-space-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 8px 30px rgb(var(--felt-dark) / 0.35)",
      },
      borderRadius: {
        card: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
