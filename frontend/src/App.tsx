import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { useIsMobile } from './hooks/useIsMobile';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';
import MobileTopBar from './components/layout/MobileTopBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Horaris from './pages/Horaris';
import Empleats from './pages/Empleats';
import Comandes from './pages/Comandes';
import Caixa from './pages/Caixa';
import Planificacio from './pages/Planificacio';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isMobile = useIsMobile();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div style={{ ...styles.appShell, flexDirection: isMobile ? 'column' : 'row' }}>
      {isMobile ? (
        <>
          <MobileTopBar />
          <main style={{ ...styles.main, paddingBottom: 72 }}>
            <div style={{ ...styles.content, padding: '20px 16px' }}>
              <Outlet />
            </div>
          </main>
          <MobileNav />
        </>
      ) : (
        <>
          <Sidebar />
          <main style={styles.main}>
            <div style={{ ...styles.content, padding: '32px 32px' }}>
              <Outlet />
            </div>
          </main>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/horaris" element={<Horaris />} />
            <Route path="/empleats" element={<Empleats />} />
            <Route path="/comandes" element={<Comandes />} />
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/planificacio" element={<Planificacio />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F5F3EC',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    minWidth: 0,
  },
  content: {
    maxWidth: 1200,
    margin: '0 auto',
  },
};
