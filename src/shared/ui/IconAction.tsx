import type { LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export type IconActionVariant = 'default' | 'ghost' | 'danger';

export interface IconActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: IconActionVariant;
  size?: 'md' | 'lg';
}

const variantClasses: Record<IconActionVariant, string> = {
  default:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost:
    'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40',
};

export const IconAction = forwardRef<HTMLButtonElement, IconActionProps>(function IconAction(
  {
    icon: Icon,
    label,
    variant = 'default',
    size = 'md',
    type = 'button',
    className,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-[var(--sp-radius-control)] transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        size === 'md' ? 'size-[var(--sp-touch-target)]' : 'size-12',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={size === 'md' ? 'size-5' : 'size-6'} />
    </button>
  );
});
