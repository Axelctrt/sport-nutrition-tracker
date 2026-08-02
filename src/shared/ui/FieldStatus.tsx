import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';

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

const stateClasses: Record<FieldStatusState, string> = {
  checking: 'text-slate-600 dark:text-slate-300',
  valid: 'text-emerald-700 dark:text-emerald-300',
  invalid: 'text-red-700 dark:text-red-300',
  unavailable: 'text-red-700 dark:text-red-300',
  error: 'text-red-700 dark:text-red-300',
};

const stateMarkers: Record<FieldStatusState, string> = {
  checking: '…',
  valid: '✓',
  invalid: '×',
  unavailable: '×',
  error: '!',
};

export function FieldStatus({
  state,
  children,
  className,
  ...props
}: FieldStatusProps) {
  const isError = state === 'invalid' || state === 'unavailable' || state === 'error';
  const message = state === 'checking' ? 'Vérification…' : children;

  return (
    <p
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      aria-atomic="true"
      data-field-status={state}
      className={cn(
        'flex min-h-6 items-start gap-2 text-sm leading-5',
        stateClasses[state],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="shrink-0 font-bold">
        {stateMarkers[state]}
      </span>
      <span>{message}</span>
    </p>
  );
}
