/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#09090f",
          900: "#0f0f1a",
          800: "#161626",
          700: "#222238",
        },
        fame: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          glow: "#6366f1",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
