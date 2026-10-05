import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

// Every colour, radius, shadow and type size used by the app comes from these tokens.
// Values live as CSS variables in src/app/globals.css (light and dark).
const tone = (name: string) => ({
  DEFAULT: `hsl(var(--${name}) / <alpha-value>)`,
  soft: `hsl(var(--${name}-soft) / <alpha-value>)`,
  strong: `hsl(var(--${name}-strong) / <alpha-value>)`,
});

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    container: {
      center: true,
      padding: { DEFAULT: '1rem', md: '1.5rem', lg: '2rem' },
      screens: { xl: '1200px' },
    },
    fontFamily: {
      display: ['var(--font-display)', 'Georgia', 'serif'],
      sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      // [size, { lineHeight, letterSpacing }]
      '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      xs: ['0.75rem', { lineHeight: '1.125rem' }],
      sm: ['0.875rem', { lineHeight: '1.375rem' }],
      base: ['1rem', { lineHeight: '1.625rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.01em' }],
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
      '3xl': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.02em' }],
      '4xl': ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.025em' }],
      '5xl': ['3.25rem', { lineHeight: '3.625rem', letterSpacing: '-0.03em' }],
      '6xl': ['4.25rem', { lineHeight: '4.5rem', letterSpacing: '-0.035em' }],
    },
    extend: {
      colors: {
        canvas: 'hsl(var(--canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          subtle: 'hsl(var(--surface-subtle) / <alpha-value>)',
          sunken: 'hsl(var(--surface-sunken) / <alpha-value>)',
          inverse: 'hsl(var(--surface-inverse) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'hsl(var(--line) / <alpha-value>)',
          strong: 'hsl(var(--line-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink) / <alpha-value>)',
          secondary: 'hsl(var(--ink-secondary) / <alpha-value>)',
          muted: 'hsl(var(--ink-muted) / <alpha-value>)',
          inverse: 'hsl(var(--ink-inverse) / <alpha-value>)',
        },
        brand: { ...tone('brand'), foreground: 'hsl(var(--brand-foreground) / <alpha-value>)' },
        brass: tone('brass'),
        success: tone('success'),
        warning: tone('warning'),
        danger: tone('danger'),
        info: tone('info'),
        refund: tone('refund'),
        focus: 'hsl(var(--focus) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius)',
        lg: 'var(--radius-lg)',
        full: '9999px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        none: 'none',
      },
      maxWidth: {
        reading: '42rem',
        content: '75rem',
      },
      spacing: {
        sidebar: '15rem',
        topbar: '3.75rem',
        bottombar: '4rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
