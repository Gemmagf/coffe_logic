import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useVacations } from '../../hooks/queries';
import { NAV_ITEMS } from './nav';
import Logo from './Logo';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';
import LangSwitcher from './LangSwitcher';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cafgic-sidebar') === 'collapsed');
  const { data: vacations } = useVacations({ status: 'PENDING' });
  const pending = vacations?.length ?? 0;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('cafgic-sidebar', next ? 'collapsed' : 'open');
  };

  const name = user?.email?.split('@')[0] ?? '';

  return (
    <aside className="sidebar" data-collapsed={collapsed}>
      <button className="side-collapse" onClick={toggle} aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}>
        <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} />
      </button>
      <div className="side-logo">
        <Logo />
        <div className="side-logo-text">
          <span className="side-logo-name">Cafgic</span>
          <span className="side-logo-sub">{user?.group?.name ?? 'Massiu Soft'}</span>
        </div>
      </div>

      <nav className="side-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="side-link" title={collapsed ? t(item.key) : undefined}>
            <Icon name={item.icon} />
            <span>{t(item.key)}</span>
            {item.to === '/empleats' && pending > 0 && <span className="count-pill">{pending}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="side-foot">
        <div className="side-user">
          <Avatar name={name || 'U'} id={user?.id} size={30} />
          <div className="side-user-info">
            <span className="side-user-name">{name}</span>
            <span className="side-user-role">{t(`roles.${user?.role ?? 'EMPLOYEE'}`)}</span>
          </div>
        </div>
        <div className="side-tools">
          <LangSwitcher className="side-tool" up />
          <ThemeToggle className="side-tool" />
          <button className="side-tool" onClick={() => { logout(); queryClient.clear(); navigate('/login'); }} title={t('common.logout')} aria-label={t('common.logout')}>
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </aside>
  );
}
