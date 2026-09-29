import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Button from './Button';

interface Options {
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  danger?: boolean;
}

type ConfirmFn = (opts: Options) => Promise<boolean>;
const Ctx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<(v: boolean) => void>();

  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => { resolver.current = resolve; setOpts(o); }), []);
  const done = (v: boolean) => { resolver.current?.(v); setOpts(null); };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts} onClose={() => done(false)} title={opts?.title ?? ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => done(false)}>{opts?.cancelLabel ?? t('common.cancel')}</Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => done(true)} autoFocus>{opts?.confirmLabel ?? t('common.confirm')}</Button>
          </>
        }
      >
        {opts?.message && <p className="t-2" style={{ fontSize: 13.5 }}>{opts.message}</p>}
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
