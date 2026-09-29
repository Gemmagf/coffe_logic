import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../api/auth';
import { DEMO } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import Logo from '../components/layout/Logo';
import LangSwitcher from '../components/layout/LangSwitcher';
import ThemeToggle from '../components/layout/ThemeToggle';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { Field, Input } from '../components/ui/Field';

const DEMO_USER = 'the commercial project';
const DEMO_PASS = 'Nikos';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null);
  const expired = new URLSearchParams(location.search).get('expired') === '1';

  const doLogin = async (e: string, p: string, kind: 'form' | 'demo') => {
    setError('');
    setBusy(kind);
    try {
      const { token, user } = await login(e, p);
      setAuth(token, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'auth.error'));
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = (ev: FormEvent) => { ev.preventDefault(); void doLogin(email, password, 'form'); };

  const points: { icon: 'calendar' | 'package' | 'chart'; key: string }[] = [
    { icon: 'calendar', key: 'auth.point1' },
    { icon: 'package', key: 'auth.point2' },
    { icon: 'chart', key: 'auth.point3' },
  ];

  return (
    <div className="auth">
      <section className="auth-side">
        <div className="row between">
          <div className="row gap-3">
            <Logo size={38} />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Cafgic</div>
              <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Massiu Soft</div>
            </div>
          </div>
          <div className="row gap-2">
            <LangSwitcher className="mtop-btn" compact />
            <ThemeToggle className="mtop-btn" />
          </div>
        </div>
        <div>
          <h1 className="auth-headline">
            {t('auth.headline1')} <em>{t('auth.headline2')}</em>
          </h1>
          <div className="auth-points">
            {points.map((p) => (
              <div key={p.key} className="auth-point">
                <span className="auth-point-ic"><Icon name={p.icon} /></span>
                <span>{t(p.key)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.55 }}>© {new Date().getFullYear()} Massiu Soft · {t('auth.subtitle')}</div>
      </section>

      <section className="auth-form">
        <div className="auth-card">
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{t('auth.welcome')}</h2>
          <p className="t-3 mt-2 mb-6" style={{ fontSize: 14 }}>{t('auth.welcomeSub')}</p>

          {expired && !error && <div className="notice notice-warning mb-4"><Icon name="clock" /><span>{t('auth.expired')}</span></div>}

          <button
            type="button" className="btn btn-accent btn-lg btn-block" style={{ height: 52, flexDirection: 'column', gap: 2 }}
            onClick={() => doLogin(DEMO_USER, DEMO_PASS, 'demo')} disabled={busy !== null}
          >
            {busy === 'demo' ? <span className="spinner" /> : (
              <>
                <span className="row gap-2"><Icon name="sparkles" />{t('auth.tryDemo')}</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Commercial – The Project · Zürich</span>
              </>
            )}
          </button>

          <div className="row gap-3 mt-5 mb-5">
            <hr className="divider grow" />
            <span className="t-xs t-4" style={{ whiteSpace: 'nowrap' }}>{t('auth.orAccount')}</span>
            <hr className="divider grow" />
          </div>

          <form onSubmit={handleSubmit} className="col gap-4">
            <Field label={t('auth.identifier')} htmlFor="email">
              <Input id="email" type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.identifierPlaceholder')} />
            </Field>
            <Field label={t('auth.password')} htmlFor="password">
              <div style={{ position: 'relative' }}>
                <Input id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight: 40 }} />
                <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', right: 4, top: 4 }} onClick={() => setShowPw((s) => !s)} aria-label={showPw ? t('auth.hidePassword') : t('auth.showPassword')}>
                  <Icon name={showPw ? 'eyeOff' : 'eye'} />
                </button>
              </div>
            </Field>

            {error && <div className="error-box" role="alert">{error}</div>}

            <Button type="submit" variant="primary" size="lg" block loading={busy === 'form'} disabled={busy !== null || !email || !password} iconRight="arrowRight">
              {t('auth.login')}
            </Button>
          </form>

          <p className="t-xs t-4 mt-6" style={{ textAlign: 'center' }}>
            {t('auth.demoCredentials', { email: DEMO_USER, password: DEMO_PASS })}{DEMO ? ` · ${t('auth.demoModeHint')}` : ''}
          </p>
        </div>
      </section>
    </div>
  );
}
