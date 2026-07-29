import { Check, CircleAlert, LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export type SaveStatusValue = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusProps {
  status: SaveStatusValue;
  className?: string;
}

const labels: Record<SaveStatusValue, string> = {
  idle: 'Enregistré sur cet appareil',
  saving: 'Enregistrement local…',
  saved: 'Enregistré sur cet appareil',
  error: 'Erreur d’enregistrement local',
};

export function SaveStatus({ status, className }: SaveStatusProps) {
  const Icon = status === 'saving' ? LoaderCircle : status === 'error' ? CircleAlert : Check;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        status === 'error' ? 'text-red-700 dark:text-red-300' : 'text-slate-500 dark:text-slate-400',
        className,
      )}
      role={status === 'error' ? 'alert' : 'status'}
    >
      <Icon
        aria-hidden="true"
        className={cn('size-4', status === 'saving' && 'animate-spin motion-reduce:animate-none')}
      />
      {labels[status]}
    </span>
  );
}
