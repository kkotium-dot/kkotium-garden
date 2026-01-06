import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FAF8F3",
        beige: "#FFF5E4",
        "pink-light": "#FFB5C5",
        "pink-main": "#FF69A5",
        gold: "#D4AF37",
        green: "#7BC67E",
        red: "#FF6B6B",
        "text-dark": "#2D2D2D",
      },
      fontFamily: {
        pretendard: ["Pretendard", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      fontSize: {
        sm: "14px",
        base: "16px",
        lg: "20px",
      },
      spacing: {
        sm: "8px",
        md: "16px",
        lg: "24px",
      },
      borderRadius: {
        sm: "8px",
        lg: "24px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0, 0, 0, 0.08)",
        hover: "0 8px 24px rgba(255, 105, 165, 0.3)",
      },
      keyframes: {
        bloom: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.8)" },
        },
        floatUp: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-30px)" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        bloom: "bloom 0.5s ease-in-out",
        floatUp: "floatUp 1s ease-out",
        spin: "spin 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
