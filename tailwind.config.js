/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Libre Caslon Display', 'Libre Caslon Text', 'Georgia', 'serif'],
        serif: ['Libre Caslon Text', 'Georgia', 'serif'],
        sans: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
