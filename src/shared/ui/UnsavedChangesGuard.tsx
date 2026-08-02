import { useEffect } from 'react';
import { useBlocker, useInRouterContext } from 'react-router-dom';

import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';

interface UnsavedChangesGuardProps {
  when: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

function RouterUnsavedChangesGuard({
  when,
  title,
  description,
  confirmLabel,
  cancelLabel,
}: Required<UnsavedChangesGuardProps>) {
  const blocker = useBlocker(when);
  const blocked = blocker.state === 'blocked';

  return (
    <ConfirmationDialog
      open={blocked}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onCancel={() => {
        if (blocker.state === 'blocked') blocker.reset();
      }}
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}

export function UnsavedChangesGuard({
  when,
  title = 'Quitter sans enregistrer ?',
  description = 'Les modifications non enregistrées seront perdues.',
  confirmLabel = 'Quitter',
  cancelLabel = 'Continuer la modification',
}: UnsavedChangesGuardProps) {
  const inRouterContext = useInRouterContext();

  useEffect(() => {
    if (!when) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when]);

  if (!inRouterContext) return null;

  return (
    <RouterUnsavedChangesGuard
      when={when}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
    />
  );
}
