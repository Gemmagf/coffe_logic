import { useTranslation } from 'react-i18next';
import Icon from '../ui/Icon';
import { useTheme, resolvedTheme } from '../../hooks/useTheme';

export default function ThemeToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const { t } = useTranslation();
  const { pref, setPref } = useTheme();
  const dark = resolvedTheme(pref) === 'dark';
  return (
    <button className={className} type="button" onClick={() => setPref(dark ? 'light' : 'dark')} aria-label={t('theme.toggle')} title={t('theme.toggle')}>
      <Icon name={dark ? 'sun' : 'moon'} />
      {withLabel && <span>{dark ? t('theme.light') : t('theme.dark')}</span>}
    </button>
  );
}
