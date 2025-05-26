import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

/**
 * Custom hook that safely accesses the theme context
 * This approach fixes the text rendering issues by ensuring we're using the context
 * instead of directly calling useColorScheme in components
 */
export function useAppTheme() {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  
  // Return the same structure to maintain compatibility
  return {
    isDark: context.isDark,
    colors: context.theme.colors
  };
}
