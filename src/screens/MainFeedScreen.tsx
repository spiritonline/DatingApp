import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainTabNavigator } from '../navigation/MainTabNavigator';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Main Feed Screen - entry point for the authenticated app experience
 * This wraps the tab navigation in the required providers for Redux and React Query
 */
export default function MainFeedScreen() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <MainTabNavigator />
        </SafeAreaProvider>
      </QueryClientProvider>
    </Provider>
  );
}
