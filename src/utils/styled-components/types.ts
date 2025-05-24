/**
 * Common type definitions for styled components
 */

export interface ThemeProps {
  isDark?: boolean;
}

export interface ButtonProps extends ThemeProps {
  disabled?: boolean;
}

export interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

export interface ProgressBarProps {
  width: number;
}

export interface ValidationProps {
  hasError?: boolean;
}

export interface LayoutProps {
  flex?: number;
  padding?: number | string;
  margin?: number | string;
}
