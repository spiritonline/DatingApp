import { useTheme } from '../theme/ThemeContext';

/**
 * Custom hook that safely accesses the theme context
 * This approach fixes the text rendering issues by ensuring we're using the context
 * instead of directly calling useColorScheme in components
 */
export function useAppTheme() {
  const { theme, isDark } = useTheme();
  
  // Return the same structure to maintain compatibility
  return {
    isDark,
    colors: theme
  };
}
