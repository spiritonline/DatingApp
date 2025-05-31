// Import polyfills first to ensure they're loaded before any Firebase-related code
import './src/utils/polyfills';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { NavigationController } from './src/navigation/NavigationController';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {  
  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      // Log to crash reporting service in production
      if (!__DEV__) {
        // TODO: Add Firebase Crashlytics or similar
        console.error('App Error:', error);
      }
    }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Separate component to use theme after ThemeProvider is available
function AppContent() {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationController />
    </>
  )
}
