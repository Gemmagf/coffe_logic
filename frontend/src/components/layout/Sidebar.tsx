import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, type LangCode } from '../../i18n';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const navItems = [
    { to: '/', label: t('nav.home') },
    { to: '/horaris', label: t('nav.schedules') },
    { to: '/empleats', label: t('nav.employees') },
    { to: '/comandes', label: t('nav.orders') },
    { to: '/caixa', label: t('nav.cash') },
    { to: '/planificacio', label: t('nav.planning') },
  ];

  const handleLang = (code: LangCode) => {
    i18n.changeLanguage(code);
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={styles.logoMark}>C</span>
        <div>
          <span style={styles.logoText}>Cafgic</span>
          <span style={styles.logoSub}>Massiu Soft</span>
        </div>
      </div>

      <nav style={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Selector d'idioma */}
      <div style={styles.langSection}>
        <span style={styles.langLabel}>Idioma / Sprache</span>
        <div style={styles.langGrid}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              style={{
                ...styles.langBtn,
                ...(i18n.language === lang.code ? styles.langBtnActive : {}),
              }}
              onClick={() => handleLang(lang.code)}
              title={lang.label}
            >
              {lang.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.userInfo}>
          <span style={styles.userRole}>{user?.role}</span>
          <span style={styles.userEmail}>{user?.email}</span>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} style={styles.logoutBtn}>
          {t('common.logout')}
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 200,
    minHeight: '100vh',
    backgroundColor: '#2D3250',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  logo: {
    padding: '22px 18px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#F4E285', color: '#2D3250',
    fontSize: 16, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: { fontSize: 16, fontWeight: 800, color: '#fff', display: 'block', letterSpacing: '-0.3px' },
  logoSub: { fontSize: 10, color: '#6B7A9F', display: 'block', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.5px' },
  nav: { flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 1 },
  navLink: {
    display: 'block',
    padding: '9px 12px',
    borderRadius: 7,
    textDecoration: 'none',
    color: '#7A84A8',
    fontSize: 13.5,
    fontWeight: 500,
    transition: 'all 0.12s',
  },
  navLinkActive: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: '#fff',
    fontWeight: 600,
  },
  langSection: {
    padding: '12px 14px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  langLabel: {
    fontSize: 9,
    color: '#4A5470',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    display: 'block',
    marginBottom: 8,
    fontWeight: 700,
  },
  langGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
  },
  langBtn: {
    padding: '5px 2px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 5,
    color: '#5A6480',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.3px',
    transition: 'all 0.12s',
  },
  langBtnActive: {
    backgroundColor: '#F4E285',
    color: '#2D3250',
    borderColor: '#F4E285',
  },
  footer: {
    padding: '14px 18px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  userInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  userRole: { fontSize: 10, color: '#6B7A9F', textTransform: 'uppercase', letterSpacing: '0.5px' },
  userEmail: { fontSize: 11, color: '#7A84A8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logoutBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    color: '#7A84A8', borderRadius: 6, padding: '6px 10px',
    fontSize: 12, cursor: 'pointer', textAlign: 'left',
  },
};
