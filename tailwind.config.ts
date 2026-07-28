import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: "#173C31",
          dark: "#0E271F",
        },
        parchment: {
          DEFAULT: "#F5EFDE",
          dim: "#EAE1C8",
        },
        ink: "#1B2A3A",
        brass: {
          DEFAULT: "#C9A227",
          light: "#E4C560",
        },
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
        card: "0 8px 30px rgba(14, 39, 31, 0.35)",
      },
      borderRadius: {
        card: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
