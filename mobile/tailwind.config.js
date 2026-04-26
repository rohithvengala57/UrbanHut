/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        accent: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        trust: {
          low: "#ef4444",
          medium: "#f59e0b",
          high: "#22c55e",
          excellent: "#0ea5e9",
        },
        surface: "#ffffff",
        background: "#f8fafc",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      boxShadow: {
        elevated:
          "0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 4px rgba(15, 23, 42, 0.04)",
        card: "0 2px 8px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "System"],
      },
    },
  },
  plugins: [],
};
