import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme, Appearance, ColorSchemeName } from 'react-native';
import { ThemeProvider as StyledThemeProvider } from 'styled-components/native';

// Theme context type
export interface ThemeContextType {
  isDark: boolean;
  theme: {
    isDark: boolean;
    colors: {
      primary: string;
      background: string;
      text: string;
      secondaryText: string;
      border: string;
    };
  };
}

// Create the context
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use the theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Props for the ThemeProvider component
interface ThemeProviderProps {
  children: ReactNode;
}

// ThemeProvider component
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Get the device color scheme using a safer approach
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  
  // Set up a listener for color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    
    // Clean up the subscription on unmount
    return () => subscription.remove();
  }, []);
  
  const isDark = colorScheme === 'dark';
  
  // Define theme based on color scheme
  const theme = {
    isDark,
    colors: {
      primary: '#FF6B6B',
      background: isDark ? '#121212' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : '#000000',
      secondaryText: isDark ? '#AAAAAA' : '#666666',
      border: isDark ? '#333333' : '#EEEEEE',
    },
  };
  
  // Provide both the theme object and isDark flag for convenience
  const contextValue: ThemeContextType = {
    isDark,
    theme,
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      <StyledThemeProvider theme={theme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
}
