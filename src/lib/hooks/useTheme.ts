'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import React from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}>({ theme: 'system', setTheme: () => {}, resolvedTheme: 'light' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('mc-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') setTheme(stored);
  }, []);

  useEffect(() => {
    const update = () => {
      localStorage.setItem('mc-theme', theme);
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
      setResolvedTheme(isDark ? 'dark' : 'light');
    };
    update();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
  }, [theme]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, setTheme, resolvedTheme } },
    children
  );
}

export const useTheme = () => useContext(ThemeContext);
