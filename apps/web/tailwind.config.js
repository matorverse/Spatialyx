/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0c0d10',         // Dark Obsidian background
          panel: '#15171e',      // Panel surface charcoal
          header: '#1a1d25',     // Navigation/header dark slate
          border: '#2a2f3d',     // Subtle professional borders
          'border-light': '#383e50', // Highlight borders
          accent: '#ff5c00',     // Premium Teenage Engineering/Ableton Orange
          'accent-hover': '#e05200',
          green: '#00e575',      // Peak indicator / Active green
          blue: '#00d2ff',       // Position / Visualizer Blue
          text: '#f1f3f9',       // Clean off-white text
          muted: '#8f96a8',      // Dimmed text
          dark: '#1c1f2a'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'studio-glow': '0 0 12px rgba(255, 92, 0, 0.15)',
        'studio-green-glow': '0 0 12px rgba(0, 229, 117, 0.2)',
      }
    },
  },
  plugins: [],
};
