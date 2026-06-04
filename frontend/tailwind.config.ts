import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ['"Playfair Display"', '"Cormorant Garamond"', "Georgia", "serif"],
      },
      colors: {
        /* Brand teal palette — Tailwind keys stay `gold-*` for back-compat,
           but the values are teal. Mirror of @theme in globals.css. */
        gold: {
          50:  "#eef5f7",
          100: "#dfe9ec",
          200: "#bcd5da",
          300: "#7ec8d3",
          400: "#3d8896",
          500: "#1f6675",
          600: "#155160",
          700: "#0e3a44",
        },
        /* Warm cream + cool slate stone palette */
        stone: {
          50:  "#faf7ee",
          100: "#f5f1e6",
          200: "#efe9d9",
          300: "#e3ddc9",
          400: "#cac3b0",
          500: "#a8b1ba",
          600: "#6f7c89",
          700: "#465766",
          800: "#1f324a",
          900: "#142a3f",
          950: "#0e2638",
        },
        /* Brand semantic shortcuts */
        brand: {
          DEFAULT: "#1f6675",
          strong: "#155160",
          soft: "#dfe9ec",
          light: "#7ec8d3",
        },
        ink: "#0e2638",
        pearl: "#e6ecf0",
        sea: "#1f6675",
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "14px",
        xl: "18px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
