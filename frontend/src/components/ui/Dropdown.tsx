import { useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface Props {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  up?: boolean;
  style?: CSSProperties;
}

export default function Dropdown({ trigger, children, align = 'right', up, style }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div className="dropdown" style={{ [align]: 0, ...(up ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }) }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
