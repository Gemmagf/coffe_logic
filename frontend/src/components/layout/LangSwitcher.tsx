import { useTranslation } from 'react-i18next';
import Dropdown from '../ui/Dropdown';
import Icon from '../ui/Icon';
import { LANGUAGES, type LangCode } from '../../i18n';
import { cn } from '../../lib/cn';

export default function LangSwitcher({ className, up, compact }: { className?: string; up?: boolean; compact?: boolean }) {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'de').slice(0, 2) as LangCode;
  return (
    <Dropdown up={up} align={compact ? 'right' : 'left'} style={compact ? undefined : { flex: 1 }}
      trigger={() => (
        <button className={cn(className)} type="button" aria-label="Language">
          <Icon name="globe" /><span>{current.toUpperCase()}</span>
        </button>
      )}
    >
      {(close) => LANGUAGES.map((l) => (
        <button key={l.code} className="dropdown-item" aria-current={current === l.code} onClick={() => { i18n.changeLanguage(l.code); document.documentElement.lang = l.code; close(); }}>
          <span className="t-xs t-bold" style={{ width: 22, color: 'var(--ink-3)' }}>{l.code.toUpperCase()}</span>{l.label}
        </button>
      ))}
    </Dropdown>
  );
}
