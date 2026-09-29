import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MobileTopBar from './MobileTopBar';
import { NAV_ITEMS } from './nav';
import { DEMO } from '../../api/client';
import { fmtDate } from '../../lib/dates';

export default function AppShell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const loc = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const current = NAV_ITEMS.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));

  return (
    <div className="shell">
      {!isMobile && <Sidebar />}
      <div className="shell-main">
        {isMobile ? <MobileTopBar /> : (
          <div className="topbar">
            <div className="crumbs">
              <span>Cafgic</span><span>/</span><strong>{current ? t(current.key) : ''}</strong>
            </div>
            <div className="row gap-3">
              <span className="t-sm t-3 hide-mobile">{fmtDate(new Date(), 'EEEE, d MMMM yyyy')}</span>
              {DEMO && <span className="demo-pill" title={t('common.demoHint')}>{t('common.demo')}</span>}
            </div>
          </div>
        )}
        <main className="shell-content" key={loc.pathname}>
          <Outlet />
        </main>
        {isMobile && <MobileNav />}
      </div>
    </div>
  );
}
