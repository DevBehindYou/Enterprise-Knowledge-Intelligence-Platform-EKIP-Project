/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // See docs/05-uiux-design-system.md §1 — these ARE the design tokens, not approximations.
        canvas: '#14141A',
        chromeline: '#2A2A32',
        surface: '#EDEDEA',
        'surface-raised': '#F6F6F4',
        ink: '#111114',
        'ink-muted': '#5B5B63',
        line: '#D8D8D4',
        accent: { DEFAULT: '#3D46F5', dim: '#2B32C4', tint: '#E4E5FD' },
        signal: '#0B0B0D',
        success: { DEFAULT: '#1FA971', tint: '#E1F5EC' },
        warning: { DEFAULT: '#D98C15', tint: '#FBF0DD' },
        danger: { DEFAULT: '#E5484D', tint: '#FBE4E5' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        chrome: '28px',
        card: '20px',
        component: '10px',
      },
      spacing: {
        sidebar: '264px',
        'sidebar-collapsed': '72px',
      },
    },
  },
  plugins: [],
};
