import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        surface: {
          canvas: '#F8F9FA',
          card: '#FFFFFF',
          subtle: '#F1F3F5',
          border: '#E2E8F0',
        },
        ink: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
        },
        brand: {
          50: '#EEF6F7',
          100: '#D5E9EC',
          500: '#1D5B65',
          700: '#144047',
          900: '#0F292E',
        },
        semantic: {
          positive: '#15803D',
          caution: '#B45309',
          critical: '#B91C1C',
        },
      },
      transitionDuration: {
        micro: '150ms',
        ui: '200ms',
        section: '250ms',
      },
      transitionTimingFunction: {
        'out-smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        floating: '0 8px 24px -4px rgba(15, 41, 46, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
