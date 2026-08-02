export type FieldStatusState = 'checking' | 'valid' | 'invalid' | 'unavailable' | 'error';

interface FieldStatusProps {
  state: FieldStatusState;
  children: string;
  id?: string;
  className?: string;
}

export function FieldStatus({ state, children, id, className }: FieldStatusProps) {
  const invalid = state === 'invalid' || state === 'unavailable';
  const status = state === 'checking' || state === 'valid';
  const tone = invalid
    ? 'text-red-700 dark:text-red-300'
    : state === 'valid'
      ? 'text-emerald-700 dark:text-emerald-300'
      : state === 'error'
        ? 'text-amber-800 dark:text-amber-200'
        : 'text-slate-600 dark:text-slate-300';
  const icon = state === 'valid' ? '✓' : state === 'error' ? '!' : state === 'checking' ? '' : '×';

  return (
    <p
      id={id}
      role={status ? 'status' : 'alert'}
      aria-live="polite"
      aria-atomic="true"
      data-field-status={state}
      className={`min-h-6 flex items-start gap-2 text-sm leading-5 ${tone}${className ? ` ${className}` : ''}`}
    >
      <span
        aria-hidden="true"
        data-field-status-icon={state}
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-current text-xs leading-none${state === 'checking' ? ' animate-spin border-r-transparent motion-reduce:animate-none' : ''}`}
      >
        {icon}
      </span>
      <span>{state === 'checking' ? 'Vérification…' : children}</span>
    </p>
  );
}
