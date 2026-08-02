import type { HTMLAttributes } from 'react';

export type FieldStatusState =
  | 'checking'
  | 'valid'
  | 'invalid'
  | 'unavailable'
  | 'error';

interface FieldStatusProps extends Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> {
  state: FieldStatusState;
  children: string;
}

export function FieldStatus({
  state,
  children,
  className,
  ...props
}: FieldStatusProps) {
  const invalid = state !== 'checking' && state !== 'valid';
  const tone = invalid
    ? 'text-red-700 dark:text-red-300'
    : state === 'valid'
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-slate-600 dark:text-slate-300';

  return (
    <p
      role={invalid ? 'alert' : 'status'}
      aria-live="polite"
      aria-atomic="true"
      data-field-status={state}
      className={`min-h-6 text-sm leading-5 ${tone}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {state === 'checking' ? 'Vérification…' : children}
    </p>
  );
}
