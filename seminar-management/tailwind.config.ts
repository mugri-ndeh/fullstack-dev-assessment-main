import type { Config } from "tailwindcss";

/** `hsl(var(--x) / <alpha-value>)` keeps opacity modifiers (bg-primary/10) working. */
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  // next-themes writes `class="dark"` on <html>; Tailwind keys off the same class.
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: {
          DEFAULT: token("surface"),
          muted: token("surface-muted"),
          hover: token("surface-hover"),
        },
        fg: {
          DEFAULT: token("fg"),
          muted: token("fg-muted"),
          subtle: token("fg-subtle"),
        },
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
        },
        // Each accent exposes the same five roles:
        //   DEFAULT/hover/fg → solid buttons and badges
        //   soft/line/ink    → tinted panels (bg-danger-soft border-danger-line text-danger-ink)
        primary: {
          DEFAULT: token("primary"),
          hover: token("primary-hover"),
          fg: token("primary-fg"),
          soft: token("primary-soft"),
          line: token("primary-line"),
          ink: token("primary-ink"),
        },
        danger: {
          DEFAULT: token("danger"),
          hover: token("danger-hover"),
          fg: token("danger-fg"),
          soft: token("danger-soft"),
          line: token("danger-line"),
          ink: token("danger-ink"),
        },
        success: {
          DEFAULT: token("success"),
          hover: token("success-hover"),
          fg: token("success-fg"),
          soft: token("success-soft"),
          line: token("success-line"),
          ink: token("success-ink"),
        },
        warning: {
          DEFAULT: token("warning"),
          hover: token("warning-hover"),
          fg: token("warning-fg"),
          soft: token("warning-soft"),
          line: token("warning-line"),
          ink: token("warning-ink"),
        },
        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          fg: token("accent-fg"),
          soft: token("accent-soft"),
          line: token("accent-line"),
          ink: token("accent-ink"),
        },
      },
      ringColor: {
        DEFAULT: token("ring"),
      },
      borderColor: {
        DEFAULT: token("line"),
      },
    },
  },
  plugins: [],
};
export default config;
