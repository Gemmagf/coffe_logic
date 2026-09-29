import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import AppShell from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/Confirm';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { PageSkeleton } from './components/ui/Skeleton';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const Horaris = lazy(() => import('./pages/Horaris'));
const Empleats = lazy(() => import('./pages/Empleats'));
const Comandes = lazy(() => import('./pages/Comandes'));
const Caixa = lazy(() => import('./pages/Caixa'));
const Planificacio = lazy(() => import('./pages/Planificacio'));
const Configuracio = lazy(() => import('./pages/Configuracio'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <HashRouter>
              <Suspense fallback={<div className="shell-content"><PageSkeleton /></div>}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<AppShell />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/horaris" element={<Horaris />} />
                    <Route path="/empleats" element={<Empleats />} />
                    <Route path="/comandes" element={<Comandes />} />
                    <Route path="/caixa" element={<Caixa />} />
                    <Route path="/planificacio" element={<Planificacio />} />
                    <Route path="/configuracio" element={<Configuracio />} />
                    <Route path="/404" element={<NotFound />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
