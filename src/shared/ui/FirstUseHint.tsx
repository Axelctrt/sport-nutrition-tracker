import { Info } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';
import { ContextHelp } from '@/shared/ui/ContextHelp';
import { cn } from '@/shared/utils/cn';

interface FirstUseHintProps {
  hintKey: string;
  title: string;
  children: ReactNode;
  className?: string;
}

function storageKey(hintKey: string): string {
  return `sportpilot:first-use:${hintKey}:seen`;
}

export function FirstUseHint({
  hintKey,
  title,
  children,
  className,
}: FirstUseHintProps) {
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(storageKey(hintKey)) === 'true');
    } catch {
      setSeen(false);
    }
  }, [hintKey]);

  const acknowledge = () => {
    try {
      window.localStorage.setItem(storageKey(hintKey), 'true');
    } catch {
      // The hint can still be dismissed for the current session.
    }
    setSeen(true);
  };

  if (seen) {
    return (
      <ContextHelp
        iconOnly
        className={className}
        question={`Aide : ${title}`}
      >
        {children}
      </ContextHelp>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-900 dark:bg-brand-950/35',
        className,
      )}
      role="note"
    >
      <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
        <div className="mt-1 leading-5 text-slate-600 dark:text-slate-300">{children}</div>
        <Button className="mt-2" size="sm" variant="ghost" onClick={acknowledge}>
          Compris
        </Button>
      </div>
    </div>
  );
}
