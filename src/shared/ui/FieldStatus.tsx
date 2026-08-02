import {
  CircleAlert,
  CircleCheck,
  CircleX,
  LoaderCircle,
} from 'lucide-react';
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

const stateIcons = {
  checking: LoaderCircle,
  valid: CircleCheck,
  invalid: CircleX,
  unavailable: CircleX,
  error: CircleAlert,
} as const;

export function FieldStatus({
  state,
  children,
  className,
  ...props
}: FieldStatusProps) {
  const Icon = stateIcons[state];
  const isError = state === 'invalid' || state === 'unavailable' || state === 'error';

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
      <Icon
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-4 shrink-0',
          state === 'checking' && 'motion-safe:animate-spin motion-reduce:animate-none',
        )}
      />
      <span>{children}</span>
    </p>
  );
}
