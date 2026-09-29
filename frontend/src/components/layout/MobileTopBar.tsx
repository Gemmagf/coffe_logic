import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import Logo from './Logo';
import { NAV_ITEMS } from './nav';
import { DEMO } from '../../api/client';

export default function MobileTopBar() {
  const { t } = useTranslation();
  const loc = useLocation();
  const current = NAV_ITEMS.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));
  return (
    <div className="mtop">
      <div className="row gap-3">
        <Logo size={30} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Cafgic</div>
          {current && <div style={{ fontSize: 11, color: 'var(--side-ink-muted)' }}>{t(current.key)}</div>}
        </div>
      </div>
      {DEMO && <span className="demo-pill">{t('common.demo')}</span>}
    </div>
  );
}
