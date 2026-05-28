import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const COLORS = {
  // Brand Colors
  primary: '#3B82F6', // HSL(205 90% 55%) - Blue
  secondary: '#8B5CF6', // HSL(260 60% 65%) - Purple
  accent: '#F97316', // HSL(25 95% 60%) - Orange
  
  // Gradients (Represented as start/end colors)
  gradientHeroStart: '#3B82F6',
  gradientHeroEnd: '#8B5CF6',
  gradientAccentStart: '#F97316',
  gradientAccentEnd: '#EC4899',
  
  // Backgrounds
  background: '#0F172A', // Darker slate
  card: '#1E293B',
  cardLight: 'rgba(30, 41, 59, 0.6)',
  
  // Text
  foreground: '#F1F5F9',
  muted: '#94A3B8',
  
  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  
  // Borders
  border: 'rgba(148, 163, 184, 0.1)',
  borderLight: 'rgba(148, 163, 184, 0.05)',
};

export const LIGHT_COLORS = {
  // Brand Colors
  primary: '#2563EB', // Rich Blue
  secondary: '#7C3AED', // Deep Purple
  accent: '#EA580C', // Vibrant Orange
  
  // Gradients (Represented as start/end colors)
  gradientHeroStart: '#2563EB',
  gradientHeroEnd: '#7C3AED',
  gradientAccentStart: '#EA580C',
  gradientAccentEnd: '#DB2777',
  
  // Backgrounds
  background: '#F8FAFC', // Slate 50
  card: '#FFFFFF', // Pure White
  cardLight: 'rgba(255, 255, 255, 0.85)',
  
  // Text
  foreground: '#0F172A', // Slate 900
  muted: '#64748B', // Slate 500
  
  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  
  // Borders
  border: 'rgba(100, 116, 139, 0.15)',
  borderLight: 'rgba(100, 116, 139, 0.08)',
};

type ThemeColorsType = typeof COLORS;

interface ThemeContextType {
  isDarkMode: boolean;
  colors: ThemeColorsType;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true, // Default to dark mode as design base
  colors: COLORS,
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = 'edumee_app_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadStoredTheme() {
      try {
        let storedTheme: string | null = null;
        if (Platform.OS === 'web') {
          storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        } else {
          storedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        }
        
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadStoredTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const nextMode = !isDarkMode;
      setIsDarkMode(nextMode);
      
      const themeValue = nextMode ? 'dark' : 'light';
      if (Platform.OS === 'web') {
        localStorage.setItem(THEME_STORAGE_KEY, themeValue);
      } else {
        await SecureStore.setItemAsync(THEME_STORAGE_KEY, themeValue);
      }
    } catch (error) {
      console.error('Failed to store theme preference', error);
    }
  };

  const colors = isDarkMode ? COLORS : (LIGHT_COLORS as unknown as ThemeColorsType);

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
