import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        iium: {
          green: "#00918e",
          turquoise: "#00918e",
          deep: "#006b69",
          gold: "#d59f0f",
          mist: "#edf8f7",
          black: "#000000"
        }
      },
      boxShadow: {
        glass: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)",
        lift: "0 10px 30px rgba(0, 107, 105, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
