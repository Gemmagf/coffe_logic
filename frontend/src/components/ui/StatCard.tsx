import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';
import { cn } from '../../lib/cn';

interface Props {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  delta?: { value: number; label?: ReactNode; goodWhenUp?: boolean; formatted?: string };
  sub?: ReactNode;
  hero?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export default function StatCard({ label, value, icon, delta, sub, hero, onClick, children }: Props) {
  const up = delta ? delta.value > 0 : false;
  const flat = delta ? delta.value === 0 : true;
  const good = delta ? (delta.goodWhenUp ?? true) === up : true;
  return (
    <div className={cn('card stat', hero && 'stat-hero', onClick && 'card-hover')} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="row between">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon"><Icon name={icon} /></span>}
      </div>
      <span className="stat-value">{value}</span>
      {delta && (
        <span className={cn('stat-delta', flat ? 't-3' : good ? 't-success' : 't-danger')}>
          {!flat && <Icon name={up ? 'arrowUp' : 'arrowDown'} size={13} />}
          {delta.formatted ?? `${up ? '+' : ''}${delta.value}%`}
          {delta.label && <span className="t-3" style={{ fontWeight: 500 }}>{delta.label}</span>}
        </span>
      )}
      {sub && <span className="t-sm t-3">{sub}</span>}
      {children}
    </div>
  );
}
