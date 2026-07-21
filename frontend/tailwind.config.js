import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      maxWidth: {
        content: '1440px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Semantic tokens (CSS-variable driven, support /alpha). */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          50: '#E8F8F0',
          500: '#16A36A',
          600: '#128A5A',
          700: '#0F6B47',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        /* Fixed brand + neutral scales (Graphite + Amber). */
        brand: {
          50: '#FFFAF0',
          100: '#FFF4DD',
          200: '#F8DFB0',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#C66A05',
          800: '#9A4E04',
        },
        graphite: {
          50: '#F7F7F5',
          100: '#F0F0ED',
          200: '#E2E2DE',
          300: '#D5D6DA',
          400: '#8A8D96',
          500: '#5F626B',
          600: '#454852',
          700: '#3A3B41',
          800: '#2A2B31',
          900: '#1C1D21',
          950: '#111216',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#FAFAF8',
          hover: '#FCFCFA',
        },
        danger: {
          50: '#FDEBEC',
          200: '#F7C6C8',
          500: '#E5484D',
          600: '#D33A3F',
          700: '#B93036',
          800: '#9A2429',
          900: '#7E1E22',
        },
        info: {
          50: '#EAF2FF',
          500: '#3B82F6',
          600: '#2E6BD6',
          700: '#2457B0',
        },
      },
      borderRadius: {
        panel: '16px',
        card: '14px',
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(24, 24, 27, 0.05)',
        card: '0 4px 16px rgba(24, 24, 27, 0.06)',
        hover: '0 8px 24px rgba(24, 24, 27, 0.09)',
        modal: '0 24px 70px rgba(17, 18, 22, 0.18)',
        dropdown: '0 10px 30px rgba(24, 24, 27, 0.12)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
