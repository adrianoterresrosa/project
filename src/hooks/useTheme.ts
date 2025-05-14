import { useState, useEffect } from 'react';
import { useSettings } from './useSettings';

interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    border: string;
  };
}

const themes: Theme[] = [
  {
    id: 'light',
    name: 'Claro',
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#1F2937',
      border: '#E5E7EB'
    }
  },
  {
    id: 'dark',
    name: 'Escuro',
    colors: {
      primary: '#60A5FA',
      secondary: '#34D399',
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      border: '#374151'
    }
  }
];

export function useTheme() {
  const { settings, updateSettings } = useSettings();
  const [currentTheme, setCurrentTheme] = useState<Theme>(
    themes.find(t => t.id === settings.preferences.theme) || themes[0]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', currentTheme.id);
  }, [currentTheme]);

  useEffect(() => {
    setCurrentTheme(themes.find(t => t.id === settings.preferences.theme) || themes[0]);
  }, [settings.preferences.theme]);

  const changeTheme = async (themeId: string) => {
    const newTheme = themes.find(t => t.id === themeId);
    if (newTheme) {
      await updateSettings({
        ...settings,
        preferences: {
          ...settings.preferences,
          theme: themeId as 'light' | 'dark'
        }
      });
      setCurrentTheme(newTheme);
    }
  };

  return {
    themes,
    currentTheme,
    changeTheme
  };
}