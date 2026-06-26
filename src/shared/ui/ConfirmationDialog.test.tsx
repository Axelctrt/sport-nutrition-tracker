import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';

function DialogHarness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Supprimer</button>
      <ConfirmationDialog
        open={open}
        title="Supprimer la recette ?"
        description="Cette action est définitive."
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

afterEach(cleanup);

describe('ConfirmationDialog', () => {
  it('place le focus dans la fenêtre et se ferme avec Échap', () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Supprimer' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('exécute la confirmation explicite', () => {
    const onConfirm = vi.fn();
    render(<DialogHarness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[1]!);
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
