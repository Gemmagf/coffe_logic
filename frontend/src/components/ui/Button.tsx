import { forwardRef, type ButtonHTMLAttributes } from 'react';
import Icon, { type IconName } from './Icon';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'success' | 'danger' | 'danger-outline';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  block?: boolean;
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, loading, block, className, children, disabled, type = 'button', ...rest }, ref,
) {
  const iconOnly = !children && !!icon;
  return (
    <button
      ref={ref} type={type} disabled={disabled || loading}
      className={cn('btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, block && 'btn-block', iconOnly && 'btn-icon', className)}
      {...rest}
    >
      {loading ? <span className="spinner" /> : icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight && !loading && <Icon name={iconRight} />}
    </button>
  );
});

export default Button;
