import type { Config } from "tailwindcss";

// Retro Pop Garden Fantasy v6 — token mirror.
// Primitives live in src/app/globals.css (:root). Utility classes here let
// Tailwind generate bg-gp-*, text-gp-*, border-gp-* for opt-in v6 usage.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // #132 brand DISPLAY font token. `font-display` utility -> Cafe24
      // Ssurround (var set by next/font/local in layout.tsx), falling back to
      // Pretendard so Korean glyphs render correctly during font-display:swap
      // and numerics/Latin degrade gracefully. Titles/headings only; body +
      // numeric data stay Pretendard. Rollback = remove this token + the
      // var on <html>.
      fontFamily: {
        display: ["var(--font-brand)", "Pretendard", "-apple-system", "sans-serif"],
      },
      // S2-A.1 (#145): Tailwind preflight defaults every bare `border` to
      // gray-200 via borderColor.DEFAULT. The globals.css class override only
      // catches `.border-gray-*` classes, so color-less `border` still leaked
      // gray app-wide. Rebrand the default to the brand border token — true
      // root fix for the gray-border retrofit.
      borderColor: {
        DEFAULT: "var(--color-border)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // S2-A.1 (#142): redefine Tailwind's default `pink` palette to brand
        // tokens so every legacy `pink-*` utility (bg/text/border/ring, incl.
        // hover/group-hover/focus) reads brand pink/red instead of Tailwind
        // magenta — single source, no per-class CSS overrides. 500+ = action red.
        pink: {
          50: "var(--gp-pink-50)",
          100: "var(--gp-pink-100)",
          200: "var(--gp-pink-200)",
          300: "var(--gp-pink-300)",
          400: "var(--gp-pink-400)",
          500: "var(--brand-red)",
          600: "var(--brand-red)",
          700: "var(--gp-red-600)",
          800: "var(--gp-red-600)",
          900: "var(--gp-red-600)",
        },
        // v6 palette — semantic + primitive aliases
        "gp-cream": {
          50: "var(--gp-cream-50)",
          100: "var(--gp-cream-100)",
          200: "var(--gp-cream-200)",
        },
        "gp-red": {
          50: "var(--gp-red-50)",
          100: "var(--gp-red-100)",
          500: "var(--gp-red-500)",
          600: "var(--gp-red-600)",
        },
        "gp-pink": {
          50: "var(--gp-pink-50)",
          100: "var(--gp-pink-100)",
          200: "var(--gp-pink-200)",
          300: "var(--gp-pink-300)",
          400: "var(--gp-pink-400)",
        },
        "gp-green": {
          50: "var(--gp-green-50)",
          100: "var(--gp-green-100)",
          500: "var(--gp-green-500)",
          700: "var(--gp-green-700)",
        },
        "gp-ink": {
          900: "var(--gp-ink-900)",
          700: "var(--gp-ink-700)",
          500: "var(--gp-ink-500)",
          300: "var(--gp-ink-300)",
          100: "var(--gp-ink-100)",
        },
      },
      borderRadius: {
        "gp-card": "var(--radius-card)",
        "gp-button": "var(--radius-button)",
        "gp-pill": "var(--radius-pill)",
      },
      boxShadow: {
        "gp-card": "0 1px 2px rgba(230,35,16,0.04), 0 2px 8px rgba(230,35,16,0.06)",
        "gp-sticker":
          "0 1px 0 rgba(0,0,0,0.06), 0 2px 3px rgba(230,35,16,0.10), inset 0 1px 0 rgba(255,255,255,0.6)",
        "gp-btn":
          "0 1px 0 rgba(0,0,0,0.08), 0 2px 6px rgba(230,35,16,0.18)",
      },
      spacing: {
        "gp-1": "var(--space-1)",
        "gp-2": "var(--space-2)",
        "gp-3": "var(--space-3)",
        "gp-4": "var(--space-4)",
        "gp-6": "var(--space-6)",
        "gp-8": "var(--space-8)",
        "gp-12": "var(--space-12)",
        "gp-16": "var(--space-16)",
      },
    },
  },
  plugins: [],
};

export default config;
