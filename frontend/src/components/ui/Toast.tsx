import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon, { type IconName } from './Icon';

type Kind = 'success' | 'error' | 'info' | 'warning';
interface ToastItem { id: number; kind: Kind; message: ReactNode }

interface ToastApi {
  push: (kind: Kind, message: ReactNode) => void;
  success: (m: ReactNode) => void;
  error: (m: ReactNode) => void;
  info: (m: ReactNode) => void;
  warning: (m: ReactNode) => void;
}

const Ctx = createContext<ToastApi | null>(null);
const ICONS: Record<Kind, IconName> = { success: 'checkCircle', error: 'xCircle', info: 'info', warning: 'alert' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((kind: Kind, message: ReactNode) => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3800);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    push,
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
    warning: (m) => push('warning', m),
  }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}>
              <Icon name={ICONS[t.kind]} />
              <div>{t.message}</div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
