import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

export interface TabItem<K extends string> { key: K; label: ReactNode; icon?: IconName; count?: number }

export default function Tabs<K extends string>({ items, value, onChange }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button key={it.key} role="tab" className="tab" aria-selected={value === it.key} onClick={() => onChange(it.key)}>
          {it.icon && <Icon name={it.icon} />}
          {it.label}
          {it.count ? <span className="count-pill">{it.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Segmented<K extends string>({ items, value, onChange }: { items: { key: K; label: ReactNode }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="segmented" role="group">
      {items.map((it) => (
        <button key={it.key} aria-pressed={value === it.key} onClick={() => onChange(it.key)}>{it.label}</button>
      ))}
    </div>
  );
}
