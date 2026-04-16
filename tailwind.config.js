/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        xrp: { DEFAULT: '#0077ff', dark: '#0055cc', light: '#e6f1ff' },
      },
    },
  },
  plugins: [],
};
