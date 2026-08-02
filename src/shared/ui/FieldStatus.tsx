export type FieldStatusState =
  | 'checking'
  | 'valid'
  | 'invalid'
  | 'unavailable'
  | 'error';

interface FieldStatusProps {
  state: FieldStatusState;
  children: string;
  id?: string;
  className?: string;
}

export function FieldStatus({ state, children, id, className }: FieldStatusProps) {
  const invalid = state !== 'checking' && state !== 'valid';
  const tone = invalid
    ? 'text-red-700 dark:text-red-300'
    : state === 'valid'
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-slate-600 dark:text-slate-300';

  return (
    <p
      id={id}
      role={invalid ? 'alert' : 'status'}
      aria-live="polite"
      aria-atomic="true"
      data-field-status={state}
      className={`min-h-6 text-sm leading-5 ${tone}${className ? ` ${className}` : ''}`}
    >
      {state === 'checking' ? 'Vérification…' : children}
    </p>
  );
}
