import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { ToastProvider } from '@/shared/toast/ToastProvider';
import { useToast } from '@/shared/toast/useToast';

function ToastActionHarness({
  onUndo,
}: {
  onUndo: () => void;
}) {
  const toast = useToast();

  return (
    <button
      type="button"
      onClick={() =>
        toast.showToast({
          title: 'Élément supprimé',
          description: 'Activité course',
          durationMs: 8_000,
          action: {
            label: 'Annuler',
            ariaLabel: 'Annuler la suppression de l’activité',
            onClick: onUndo,
          },
        })
      }
    >
      Supprimer
    </button>
  );
}

describe('action des notifications', () => {
  it('exécute l’action puis ferme le toast', () => {
    const onUndo = vi.fn();

    render(
      <ToastProvider>
        <ToastActionHarness onUndo={onUndo} />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Supprimer' }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Annuler la suppression de l’activité',
      }),
    );

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('Élément supprimé'),
    ).not.toBeInTheDocument();
  });
});
