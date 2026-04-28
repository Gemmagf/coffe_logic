import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';

const DEMO_EMAIL = 'owner@commercial.ch';
const DEMO_PASS  = 'demo1234';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const doLogin = async (e: string, p: string) => {
    const { token, user } = await login(e, p);
    setAuth(token, user);
    navigate('/');
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError('');
    setLoading(true);
    try {
      await doLogin(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en iniciar sessió');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await doLogin(DEMO_EMAIL, DEMO_PASS);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en accedir a la demo');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgAccent} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoMark}>C</div>
          <h1 style={styles.logoText}>Cafgic</h1>
          <p style={styles.logoSub}>{t('auth.subtitle')}</p>
        </div>

        {/* Demo button — prominent, above the form */}
        <button
          type="button"
          style={{ ...styles.demoBtn, opacity: demoLoading ? 0.7 : 1 }}
          onClick={handleDemo}
          disabled={demoLoading || loading}
        >
          {demoLoading ? '...' : t('auth.tryDemo')}
          {!demoLoading && <span style={styles.demoBadge}>The Commercial Project</span>}
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>o accés amb compte</span>
          <span style={styles.dividerLine} />
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="propietari@local.ch"
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            style={{ ...styles.loginBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading || demoLoading || !email || !password}
          >
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#2D3250',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  bgAccent: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 400,
    height: 400,
    borderRadius: '50%',
    backgroundColor: 'rgba(244,226,133,0.08)',
    pointerEvents: 'none',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: '40px 36px 32px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
    position: 'relative',
    zIndex: 1,
  },
  logoArea: {
    marginBottom: 28,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  logoMark: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#2D3250', color: '#F4E285',
    fontSize: 26, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  logoText: {
    fontSize: 28, fontWeight: 900, color: '#2D3250',
    margin: 0, letterSpacing: '-1px',
  },
  logoSub: {
    fontSize: 11, color: '#9CA3AF', margin: 0,
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },

  // Demo button
  demoBtn: {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#F4E285',
    color: '#2D3250',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    transition: 'opacity 0.15s',
    letterSpacing: '-0.2px',
  },
  demoBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#6B7280',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },

  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E4D9',
  },
  dividerText: {
    fontSize: 11,
    color: '#C4BFB8',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Login form
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: {
    fontSize: 11, fontWeight: 700, color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  input: {
    padding: '10px 13px',
    borderRadius: 8,
    border: '1.5px solid #E8E4D9',
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#FAFAF8',
    color: '#2D3250',
  },
  error: {
    fontSize: 13, color: '#c0392b', margin: 0,
    padding: '9px 13px', backgroundColor: '#fef2f2',
    borderRadius: 8, border: '1px solid #fecaca', fontWeight: 500,
  },
  loginBtn: {
    padding: '11px',
    backgroundColor: '#2D3250',
    color: '#F4E285',
    border: 'none',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    letterSpacing: '0.2px',
  },
};
