import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aegean: "#0B2545",
        mediterranean: "#134074",
        ivory: "#F5F1E6",
        bronze: "#8C6A3F",
        gold: "#C9A24B",
        status: {
          failed: "#C1440E",
          atrisk: "#D99A2B",
          operational: "#2E6F95",
          repairing: "#7B4F9E",
          restored: "#3C8C5B",
        },
      },
      fontFamily: {
        serif: ["Cinzel", "Georgia", "serif"],
        heading: ["var(--font-heading)", "Cinzel", "Georgia", "serif"],
        paint: ["var(--font-alegreya)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
