import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  pad?: 'none' | 'sm' | 'md';
  hover?: boolean;
  accent?: boolean;
  warm?: boolean;
}

export default function Card({ pad = 'md', hover, accent, warm, className, children, ...rest }: Props) {
  return (
    <div className={cn('card', pad === 'md' && 'card-pad', pad === 'sm' && 'card-pad-sm', hover && 'card-hover', accent && 'card-accent', warm && 'panel-warm', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-head">
      <div className="grow">
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}
