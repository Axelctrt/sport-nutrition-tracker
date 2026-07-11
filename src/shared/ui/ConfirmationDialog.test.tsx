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

  it('utilise des identifiants ARIA uniques et expose l’état occupé', () => {
    const firstProps = {
      title: 'Première confirmation',
      description: 'Première description',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };
    const secondProps = {
      title: 'Deuxième confirmation',
      description: 'Deuxième description',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };

    const view = render(
      <>
        <ConfirmationDialog open isPending {...firstProps} />
        <ConfirmationDialog open={false} {...secondProps} />
      </>,
    );

    const firstDialog = screen.getByRole('alertdialog');
    expect(firstDialog).toHaveAttribute('aria-busy', 'true');
    const firstLabelledBy = firstDialog.getAttribute('aria-labelledby');
    const firstDescribedBy = firstDialog.getAttribute('aria-describedby');

    view.rerender(
      <>
        <ConfirmationDialog open={false} {...firstProps} />
        <ConfirmationDialog open {...secondProps} />
      </>,
    );

    const secondDialog = screen.getByRole('alertdialog');
    expect(secondDialog.getAttribute('aria-labelledby')).not.toBe(firstLabelledBy);
    expect(secondDialog.getAttribute('aria-describedby')).not.toBe(firstDescribedBy);
  });

});
