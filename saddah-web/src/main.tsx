import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import App from './App';
import { setupGlobalErrorHandler } from './utils/errorHandler';
import './i18n';
import './styles/globals.css';

// Initialize global error handlers for unhandled promise rejections and errors
setupGlobalErrorHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          richColors
          dir="rtl"
          toastOptions={{
            className: 'font-arabic',
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
