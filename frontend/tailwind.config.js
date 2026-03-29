/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: {
          400: '#CEFF00', // Our electric lime main color
          500: '#B0DF00',
        },
        zinc: {
          850: '#1f1f22',
          900: '#18181b',
          950: '#09090b',
        },
        void: '#000000',
        panel: '#0C0C0C',
        surface: '#121212',
        dim: '#71717A',
        normal: '#A1A1AA',
        bright: '#FFFFFF',
        error: '#FF3366',
        success: '#00FF66',
        'accent-primary': '#CEFF00',
        'accent-secondary': '#ffffff',
        'accent-muted': '#52525B',
        'accent-lavender': '#a78bfa',
        'status-success': '#00FF66',
        'status-error': '#FF3366',
        'status-warning': '#CEFF00',
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in': 'slideInLeft 0.5s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
