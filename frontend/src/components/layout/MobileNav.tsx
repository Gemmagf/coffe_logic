import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { to: '/', end: true, key: 'nav.home' },
  { to: '/horaris',     end: false, key: 'nav.schedules' },
  { to: '/empleats',    end: false, key: 'nav.employees' },
  { to: '/comandes',    end: false, key: 'nav.orders' },
  { to: '/caixa',       end: false, key: 'nav.cash' },
  { to: '/planificacio',end: false, key: 'nav.planning' },
];

export default function MobileNav() {
  const { t } = useTranslation();
  return (
    <nav style={styles.bar}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            ...styles.item,
            ...(isActive ? styles.itemActive : {}),
          })}
        >
          {({ isActive }) => (
            <>
              <span style={{ ...styles.dot, opacity: isActive ? 1 : 0 }} />
              <span style={styles.label}>{t(item.key)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#2D3250',
    display: 'flex',
    zIndex: 100,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  item: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    textDecoration: 'none',
    color: '#5A6480',
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: '0.2px',
    textTransform: 'uppercase',
    transition: 'color 0.12s',
    padding: '6px 2px',
  },
  itemActive: {
    color: '#F4E285',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    backgroundColor: '#F4E285',
    transition: 'opacity 0.12s',
  },
  label: {
    maxWidth: 52,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
