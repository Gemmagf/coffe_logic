import type { IconName } from '../ui/Icon';

export interface NavItem { to: string; end?: boolean; key: string; icon: IconName }

export const NAV_ITEMS: NavItem[] = [
  { to: '/',             end: true,  key: 'nav.home',      icon: 'home' },
  { to: '/horaris',      end: false, key: 'nav.schedules', icon: 'calendar' },
  { to: '/empleats',     end: false, key: 'nav.employees', icon: 'users' },
  { to: '/comandes',     end: false, key: 'nav.orders',    icon: 'package' },
  { to: '/caixa',        end: false, key: 'nav.cash',      icon: 'wallet' },
  { to: '/planificacio', end: false, key: 'nav.planning',  icon: 'chart' },
  { to: '/configuracio', end: false, key: 'nav.settings',  icon: 'settings' },
];

/** Bottom bar on phones shows the five most-used sections; the rest live behind "more". */
export const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 5);
export const MOBILE_MORE = NAV_ITEMS.slice(5);
