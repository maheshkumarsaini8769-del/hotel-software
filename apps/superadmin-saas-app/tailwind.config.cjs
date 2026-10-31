/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './apps/superadmin-saas-app/index.html',
    './apps/superadmin-saas-app/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    './packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        charcoal: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
        sage: {
          50: '#f4f7f5',
          100: '#e5ede8',
          200: '#cbdad0',
          300: '#a7bfb0',
          400: '#7d9e8b',
          500: '#5c826b',
          600: '#476854',
          700: '#3a5344',
          800: '#304338',
          900: '#29382f',
        },
      },
    },
  },
  plugins: [],
};
