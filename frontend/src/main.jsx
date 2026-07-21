import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
      // Always attempt requests instead of pausing when the browser reports
      // itself offline — navigator.onLine is unreliable behind some proxies/VPNs
      // and would otherwise leave data pages stuck with no error and no data.
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            closeButton
            toastOptions={{
              style: { fontFamily: 'Inter, sans-serif', borderRadius: '12px' },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
