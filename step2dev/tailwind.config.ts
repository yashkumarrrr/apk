import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        bg:      '#080c10',
        surface: {
          DEFAULT: '#0d1117',
          '2': '#161b22',
          '3': '#1c2128',
        },
        border:  '#30363d',
        accent:  { DEFAULT: '#2563eb', '2': '#3b82f6' },
        success: '#22c55e',
        danger:  '#ef4444',
        warning: '#f59e0b',
        muted:   '#7d8590',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease both',
      },
    },
  },
  plugins: [],
}

export default config
