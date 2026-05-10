import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mc: {
          primary: '#2563eb',      // Mission Control blue
          secondary: '#64748b',
          success: '#16a34a',
          warning: '#ea580c',
          danger: '#dc2626',
          surface: '#f8fafc',
          border: '#e2e8f0',
        },
        kanban: {
          backlog: '#94a3b8',
          todo: '#3b82f6',
          in_progress: '#f59e0b',
          review: '#8b5cf6',
          done: '#22c55e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
