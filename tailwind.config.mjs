/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper: '#fbf8f3',
        ink: '#1a1a1a',
        muted: '#6a6256',
        rule: '#e6dfd2',
        oxblood: '#7a1f1f',
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
};