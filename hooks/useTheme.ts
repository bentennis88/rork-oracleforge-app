import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import Colors from '@/constants/colors';
import { useColorScheme } from 'react-native';

const THEME_KEY = 'oracleforge_theme';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  // Dark-first by default (futuristic aesthetic), while still respecting overrides.
  const [mode, setMode] = useState<'system' | 'dark' | 'light'>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (value !== null) {
        if (value === 'dark' || value === 'light' || value === 'system') {
          setMode(value);
        }
      }
      setIsLoaded(true);
    });
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return systemScheme === 'dark';
  }, [mode, systemScheme]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      // Toggle between explicit dark/light overrides.
      const currentlyDark =
        prev === 'system' ? systemScheme === 'dark' : prev === 'dark';
      const next = currentlyDark ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, [systemScheme]);

  const colors = isDark ? Colors.dark : Colors.light;

  return {
    isDark,
    isLoaded,
    colors,
    toggleTheme,
    themeMode: mode,
  };
});
