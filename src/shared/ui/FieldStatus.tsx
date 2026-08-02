import { Check, CircleAlert, LoaderCircle, X } from 'lucide-react';

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

function FieldStatusIcon({ state }: { state: FieldStatusState }) {
  if (state === 'checking') {
    return (
      <LoaderCircle
        aria-hidden="true"
        data-field-status-icon="checking"
        className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none"
      />
    );
  }

  if (state === 'valid') {
    return (
      <span
        aria-hidden="true"
        data-field-status-icon="valid"
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-current"
      >
        <Check className="size-3" />
      </span>
    );
  }

  if (state === 'error') {
    return (
      <CircleAlert
        aria-hidden="true"
        data-field-status-icon="error"
        className="mt-0.5 size-4 shrink-0"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      data-field-status-icon={state}
      className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-current"
    >
      <X className="size-3" />
    </span>
  );
}

export function FieldStatus({ state, children, id, className }: FieldStatusProps) {
  const invalid = state === 'invalid' || state === 'unavailable';
  const tone = invalid
    ? 'text-red-700 dark:text-red-300'
    : state === 'valid'
      ? 'text-emerald-700 dark:text-emerald-300'
      : state === 'error'
        ? 'text-amber-800 dark:text-amber-200'
        : 'text-slate-600 dark:text-slate-300';

  return (
    <p
      id={id}
      role={state === 'checking' || state === 'valid' ? 'status' : 'alert'}
      aria-live="polite"
      aria-atomic="true"
      data-field-status={state}
      className={`min-h-6 flex items-start gap-2 text-sm leading-5 ${tone}${className ? ` ${className}` : ''}`}
    >
      <FieldStatusIcon state={state} />
      <span>{state === 'checking' ? 'Vérification…' : children}</span>
    </p>
  );
}
