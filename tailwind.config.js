/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#0d0d10",
          900: "#141418",
          800: "#1c1c21",
          700: "#27272c",
        },
        fame: {
          400: "#d4d4d8",
          500: "#a1a1aa",
          600: "#52525b",
          glow: "#71717a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
