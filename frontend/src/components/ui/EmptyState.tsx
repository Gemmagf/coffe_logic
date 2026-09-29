import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

export default function EmptyState({ icon = 'inbox', title, description, action }: { icon?: IconName; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} /></div>
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
