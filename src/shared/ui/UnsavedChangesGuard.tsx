import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';

interface UnsavedChangesGuardProps {
  when: boolean;
}

export function UnsavedChangesGuard({ when }: UnsavedChangesGuardProps) {
  const blocker = useBlocker(when);

  useEffect(() => {
    if (!when) return;
    const block = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', block);
    return () => window.removeEventListener('beforeunload', block);
  }, [when]);

  return (
    <ConfirmationDialog
      open={blocker.state === 'blocked'}
      title="Quitter sans enregistrer ?"
      description="Les modifications seront perdues."
      confirmLabel="Quitter"
      cancelLabel="Continuer la modification"
      onCancel={() => {
        if (blocker.state === 'blocked') blocker.reset();
      }}
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}
