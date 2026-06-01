/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cork: {
          50: '#f3e2c4',
          100: '#e6c98d',
          200: '#d4a965',
          300: '#b88848',
          400: '#9c6a35',
          500: '#7a5028',
          600: '#5c3a1d',
          700: '#3f2812'
        },
        frame: {
          DEFAULT: '#3a2412',
          light: '#5c3a1d',
          dark: '#1f1208'
        },
        paper: {
          yellow: '#fff59d',
          pink: '#ffc1cc',
          blue: '#bbdefb',
          green: '#c8e6c9',
          peach: '#ffd6b3',
          lavender: '#dcd1ff'
        },
        ink: '#2d2118',
        ink2: '#4a3a28'
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Nunito', 'system-ui', 'sans-serif'],
        handwritten: ['"Caveat"', 'cursive']
      },
      boxShadow: {
        'note-rest': '0 1px 1px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.18), 0 8px 14px -6px rgba(0,0,0,0.30)',
        'note-hover': '0 2px 2px rgba(0,0,0,0.12), 0 6px 10px rgba(0,0,0,0.22), 0 18px 28px -8px rgba(0,0,0,0.36)',
        'note-drag': '0 4px 4px rgba(0,0,0,0.15), 0 14px 22px rgba(0,0,0,0.28), 0 30px 50px -10px rgba(0,0,0,0.42)',
        'pin': '0 1px 1px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.35)',
        'frame': 'inset 0 0 0 6px #2a1a0c, inset 0 0 0 10px #5c3a1d, 0 24px 60px -10px rgba(0,0,0,0.55)'
      },
      keyframes: {
        'note-pop': {
          '0%': { transform: 'scale(0.4) rotate(var(--rot, 0deg))', opacity: '0' },
          '60%': { transform: 'scale(1.06) rotate(var(--rot, 0deg))', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(var(--rot, 0deg))', opacity: '1' }
        },
        'crumple-toss': {
          '0%': { transform: 'scale(1) rotate(var(--rot, 0deg)) translate(0,0)', opacity: '1' },
          '30%': { transform: 'scale(0.6) rotate(calc(var(--rot, 0deg) + 35deg)) translate(40px, 20px)', opacity: '0.95' },
          '70%': { transform: 'scale(0.25) rotate(calc(var(--rot, 0deg) + 80deg)) translate(120px, 80px)', opacity: '0.55' },
          '100%': { transform: 'scale(0.05) rotate(calc(var(--rot, 0deg) + 140deg)) translate(180px, 160px)', opacity: '0' }
        },
        'sync-spin': {
          'to': { transform: 'rotate(360deg)' }
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.55' }
        }
      },
      animation: {
        'note-pop': 'note-pop 280ms cubic-bezier(0.2, 1.4, 0.4, 1) both',
        'crumple-toss': 'crumple-toss 520ms cubic-bezier(0.4, 0, 0.6, 1) forwards',
        'sync-spin': 'sync-spin 900ms linear infinite',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
