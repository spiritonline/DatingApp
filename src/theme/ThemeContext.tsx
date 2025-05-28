import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Define theme interface
export interface ThemeProps {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
    accent: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
}

// Define light and dark color palettes
const lightColors = {
  primary: '#FF6B6B',
  background: '#FFFFFF',
  card: '#F9F9F9',
  text: '#333333',
  border: '#DDDDDD',
  notification: '#FF3B30',
  accent: '#4F74FF',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#5AC8FA',
};

const darkColors = {
  primary: '#FF6B6B',
  background: '#121212',
  card: '#1E1E1E',
  text: '#F0F0F0',
  border: '#2C2C2C',
  notification: '#FF453A',
  accent: '#5E81FF',
  error: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
  info: '#64D2FF',
};

// Create the Theme Context
const ThemeContext = createContext<ThemeProps>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

// Theme Provider component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  // Update theme when device theme changes
  useEffect(() => {
    setIsDark(colorScheme === 'dark');
  }, [colorScheme]);

  // Toggle theme function
  const toggleTheme = () => setIsDark(!isDark);

  // Theme value
  const theme: ThemeProps = {
    isDark,
    toggleTheme,
    colors: isDark ? darkColors : lightColors,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// Hook for using the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
