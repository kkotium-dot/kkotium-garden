/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pink-main': '#FF6B9D',
        'pink-light': '#FFB6C1',
        'cream': '#FFF8F0',
        'green-main': '#4CAF50',
      },
    },
  },
  plugins: [],
}