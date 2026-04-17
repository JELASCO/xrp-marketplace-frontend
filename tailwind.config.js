/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Syne', 'system-ui', 'sans-serif'], mono: ['DM Mono', 'monospace'] },
      colors: {
        bg:      '#080a0e',
        bg2:     '#0d1117',
        surface: '#111620',
        surf2:   '#161c28',
        accent:  '#3b82f6',
        accent2: '#60a5fa',
      },
      animation: { 'fade-up': 'fadeUp 0.4s ease forwards' },
      keyframes: { fadeUp: { from:{ opacity:0, transform:'translateY(12px)' }, to:{ opacity:1, transform:'translateY(0)' } } },
    },
  },
  plugins: [],
};
