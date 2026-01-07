import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import Colors from '@/constants/colors';

const THEME_KEY = 'oracleforge_theme';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [isDark, setIsDark] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (value !== null) {
        setIsDark(value === 'dark');
      }
      setIsLoaded(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const newValue = !prev;
      AsyncStorage.setItem(THEME_KEY, newValue ? 'dark' : 'light');
      return newValue;
    });
  }, []);

  const colors = isDark ? Colors.dark : Colors.light;

  return {
    isDark,
    isLoaded,
    colors,
    toggleTheme,
  };
});
