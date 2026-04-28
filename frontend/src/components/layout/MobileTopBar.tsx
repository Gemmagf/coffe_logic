import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { LANGUAGES, type LangCode } from '../../i18n';

export default function MobileTopBar() {
  const { i18n, t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showLang, setShowLang] = useState(false);

  const handleLang = (code: LangCode) => {
    i18n.changeLanguage(code);
    setShowLang(false);
  };

  return (
    <div style={styles.bar}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoMark}>C</span>
        <span style={styles.logoText}>Cafgic</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Lang button */}
        <div style={{ position: 'relative' }}>
          <button style={styles.iconBtn} onClick={() => setShowLang(!showLang)}>
            {i18n.language.toUpperCase()}
          </button>
          {showLang && (
            <div style={styles.langDropdown}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  style={{
                    ...styles.langItem,
                    ...(i18n.language === lang.code ? styles.langItemActive : {}),
                  }}
                  onClick={() => handleLang(lang.code)}
                >
                  <span style={styles.langCode}>{lang.code.toUpperCase()}</span>
                  <span style={styles.langLabel}>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User + logout */}
        <button
          style={styles.logoutBtn}
          onClick={() => { logout(); navigate('/login'); }}
          title={t('common.logout')}
        >
          {user?.email?.split('@')[0]}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    backgroundColor: '#2D3250',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoMark: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#F4E285', color: '#2D3250',
    fontSize: 14, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' },
  iconBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: '#F4E285',
    fontSize: 10,
    fontWeight: 800,
    padding: '5px 8px',
    cursor: 'pointer',
    letterSpacing: '0.4px',
  },
  langDropdown: {
    position: 'absolute',
    top: 34,
    right: 0,
    backgroundColor: '#2D3250',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 200,
    minWidth: 140,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  langItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '9px 14px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  langItemActive: { backgroundColor: 'rgba(244,226,133,0.12)' },
  langCode: { fontSize: 10, fontWeight: 800, color: '#F4E285', minWidth: 24 },
  langLabel: { fontSize: 12, color: '#9CA3AF' },
  logoutBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#7A84A8',
    fontSize: 11,
    fontWeight: 600,
    padding: '5px 10px',
    cursor: 'pointer',
    maxWidth: 100,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
