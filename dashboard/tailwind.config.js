/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#0F1117",
        panel: "#1A1D27",
        edge: "#2A2D37",
        warn: "#F59E0B",
        block: "#EF4444",
        success: "#22C55E",
        primary: "#3B82F6",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
