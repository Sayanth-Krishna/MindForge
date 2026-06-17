import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent refetching data when user switches tabs
      retry: 1, // Only retry failed requests once before showing error
      staleTime: 5 * 60 * 1000, // 5 minutes stale time
    },
  },
});
