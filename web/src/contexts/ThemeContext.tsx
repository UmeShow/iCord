"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'light' | 'dark' | 'pastel-pink' | 'pastel-blue' | 'pastel-green' | 'pastel-purple';

interface ThemeConfig {
  label: string;
  background: string;
  foreground: string;
  accentLight?: string;
  accentDark?: string;
}

const themeConfigs: Record<ThemeType, ThemeConfig> = {
  light: {
    label: 'Light',
    background: '#ffffff',
    foreground: '#171717',
  },
  dark: {
    label: 'Dark',
    background: '#0a0a0a',
    foreground: '#ededed',
  },
  'pastel-pink': {
    label: 'Pastel Pink',
    background: '#fef5f5',
    foreground: '#5a2a3a',
    accentLight: '#ffb3d9',
    accentDark: '#ff90c9',
  },
  'pastel-blue': {
    label: 'Pastel Blue',
    background: '#f0f8ff',
    foreground: '#1a3a52',
    accentLight: '#a8d5ff',
    accentDark: '#7ab8ff',
  },
  'pastel-green': {
    label: 'Pastel Green',
    background: '#f0fdf4',
    foreground: '#1a4d2e',
    accentLight: '#a6f0b0',
    accentDark: '#7dd898',
  },
  'pastel-purple': {
    label: 'Pastel Purple',
    background: '#faf5ff',
    foreground: '#3a1a52',
    accentLight: '#d4a8ff',
    accentDark: '#c07dff',
  },
};

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  config: ThemeConfig;
  availableThemes: Array<{ id: ThemeType; label: string }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeType | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = stored || (prefersDark ? 'dark' : 'light');
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const applyTheme = (newTheme: ThemeType) => {
    const config = themeConfigs[newTheme];
    document.documentElement.style.setProperty('--background', config.background);
    document.documentElement.style.setProperty('--foreground', config.foreground);
    if (config.accentLight) {
      document.documentElement.style.setProperty('--accent-light', config.accentLight);
    }
    if (config.accentDark) {
      document.documentElement.style.setProperty('--accent-dark', config.accentDark);
    }
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  const availableThemes = Object.entries(themeConfigs).map(([id, config]) => ({
    id: id as ThemeType,
    label: config.label,
  }));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        config: themeConfigs[theme],
        availableThemes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
