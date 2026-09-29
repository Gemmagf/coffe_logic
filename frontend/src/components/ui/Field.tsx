import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function Field({ label, hint, error, required, className, children, htmlFor }: FieldProps) {
  return (
    <div className={cn('field', className)}>
      {label && <label className={cn('label', required && 'label-req')} htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="hint t-danger">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { small?: boolean; addon?: ReactNode; invalid?: boolean }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, small, addon, invalid, ...rest }, ref) {
  const el = <input ref={ref} className={cn('input', small && 'input-sm', className)} aria-invalid={invalid || undefined} {...rest} />;
  if (!addon) return el;
  return <div className="input-group"><span className="input-addon">{addon}</span>{el}</div>;
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { small?: boolean; invalid?: boolean }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, small, invalid, children, ...rest }, ref) {
  return <select ref={ref} className={cn('select', small && 'select-sm', className)} aria-invalid={invalid || undefined} {...rest}>{children}</select>;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn('textarea', className)} {...rest} />;
});
