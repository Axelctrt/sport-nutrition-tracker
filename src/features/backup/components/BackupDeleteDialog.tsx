import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface BackupDeleteDialogProps {
  open: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function BackupDeleteDialog({
  open,
  isPending,
  onConfirm,
  onCancel,
}: BackupDeleteDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    if (!open) {
      setConfirmation('');
      return undefined;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isPending, onCancel, open]);

  if (!open) return null;

  const confirmed = confirmation === 'EFFACER';

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/55 p-3 backdrop-blur-[2px] sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="backup-delete-title"
        aria-describedby="backup-delete-description"
        className="safe-area-bottom w-full max-w-lg rounded-3xl border border-red-200 bg-white p-5 shadow-2xl dark:border-red-900 dark:bg-slate-900 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <Trash2 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="backup-delete-title" className="text-xl font-semibold text-slate-950 dark:text-white">
              Effacer toutes les données ?
            </h2>
            <p id="backup-delete-description" className="mt-2 leading-6 text-slate-600 dark:text-slate-300">
              Le profil, l’historique et les réglages locaux seront supprimés. Cette opération ne peut être annulée sans sauvegarde JSON.
            </p>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-red-950 dark:text-red-100">
            Saisis EFFACER pour confirmer
          </span>
          <input
            ref={inputRef}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 min-h-11 w-full rounded-xl border border-red-300 bg-white px-3 text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/25 dark:border-red-800 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={!confirmed || isPending}>
            <Trash2 aria-hidden="true" className="size-4" />
            {isPending ? 'Suppression…' : 'Effacer définitivement'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
