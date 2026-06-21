import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
          glow: "var(--accent-glow)",
        },
        accent2: {
          DEFAULT: "var(--accent2)",
          dim: "var(--accent2-dim)",
          glow: "var(--accent2-glow)",
        },
        text: {
          primary: "var(--text1)",
          secondary: "var(--text2)",
          muted: "var(--text3)",
          faint: "var(--text4)",
        },
        income: "var(--green)",
        expense: "var(--coral)",
        savings: "var(--blue)",
        transfer: "var(--text3)",
        warning: "var(--amber)",
        danger: "var(--coral)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "1.5rem",
        inner: "0.8rem",
      },
      backdropBlur: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
