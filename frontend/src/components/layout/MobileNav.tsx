import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MOBILE_PRIMARY, MOBILE_MORE } from './nav';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/cn';
import LangSwitcher from './LangSwitcher';
import ThemeToggle from './ThemeToggle';

export default function MobileNav() {
  const { t } = useTranslation();
  const [more, setMore] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const moreActive = MOBILE_MORE.some((m) => loc.pathname.startsWith(m.to));

  return (
    <>
      <nav className="mnav">
        {MOBILE_PRIMARY.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="mnav-item">
            <Icon name={item.icon} />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
        <button className={cn('mnav-item', moreActive && 'active')} onClick={() => setMore(true)}>
          <Icon name="more" />
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title={t('nav.more')}>
        <div className="col gap-2">
          {MOBILE_MORE.map((item) => (
            <button key={item.to} className="dropdown-item" style={{ padding: '12px 10px', fontSize: 14 }} onClick={() => { setMore(false); navigate(item.to); }}>
              <Icon name={item.icon} />{t(item.key)}
            </button>
          ))}
          <hr className="divider" />
          <div className="row gap-3" style={{ padding: '6px 0' }}>
            <LangSwitcher className="btn btn-secondary" compact />
            <ThemeToggle className="btn btn-secondary" withLabel />
            <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { logout(); queryClient.clear(); navigate('/login'); }}>
              <Icon name="logout" />{t('common.logout')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
