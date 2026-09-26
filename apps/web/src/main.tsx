import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';

import App from '@/App';
import { AuthProvider } from '@/auth/auth-provider';
import { MotionProvider } from '@/components/motion/motion-provider';
import '@/index.css';
import { watchSystemTheme } from '@/lib/theme';

const rootElement = document.getElementById('root');
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

if (!rootElement) {
  throw new Error('Root element was not found.');
}

watchSystemTheme();

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MotionProvider>
            <App />
          </MotionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
