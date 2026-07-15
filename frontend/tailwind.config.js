/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Inter Tight", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
      },
      colors: {
        whiteBg: "#FFFFFF",
        lightCard: "rgba(255, 255, 255, 0.45)",
        charcoalText: "#0F172A",
        vermillion: "#FF6B00",
        lightBorder: "rgba(15, 23, 42, 0.08)",
      }
    },
  },
  plugins: [],
}
