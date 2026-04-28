import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      setAuth(token, user);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en iniciar sessió';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Fons decoratiu */}
      <div style={styles.bgAccent} />

      <div style={styles.card}>
        <div style={styles.logoArea}>
          <div style={styles.logoMark}>C</div>
          <h1 style={styles.logoText}>Cafgic</h1>
          <p style={styles.logoSub}>{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="propietari@local.ch"
              required
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
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <p style={styles.hint}>{t('auth.demo')}</p>
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
    padding: '44px 40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
    position: 'relative',
    zIndex: 1,
  },
  logoArea: {
    marginBottom: 36,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2D3250',
    color: '#F4E285',
    fontSize: 26,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    letterSpacing: '-1px',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 900,
    color: '#2D3250',
    margin: 0,
    letterSpacing: '-1px',
  },
  logoSub: {
    fontSize: 12,
    color: '#9CA3AF',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  input: {
    padding: '11px 14px',
    borderRadius: 9,
    border: '1.5px solid #E8E4D9',
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#FAFAF8',
    color: '#2D3250',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  error: {
    fontSize: 13,
    color: '#c0392b',
    margin: 0,
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    border: '1px solid #fecaca',
    fontWeight: 500,
  },
  btn: {
    padding: '13px',
    backgroundColor: '#2D3250',
    color: '#F4E285',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 6,
    letterSpacing: '0.2px',
    transition: 'background-color 0.15s',
  },
  hint: {
    fontSize: 11,
    color: '#C4BFB8',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 0,
  },
};
