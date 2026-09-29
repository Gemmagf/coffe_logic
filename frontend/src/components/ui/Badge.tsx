import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'accent';

export default function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return <span className={cn('badge', tone !== 'neutral' && `badge-${tone}`, dot && 'badge-dot', className)}>{children}</span>;
}
