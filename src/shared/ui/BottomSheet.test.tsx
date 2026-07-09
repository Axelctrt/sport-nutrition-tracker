import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import { BottomSheet } from '@/shared/ui/BottomSheet';

function BottomSheetHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onClose();
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Ouvrir les méthodes d’ajout</button>
      <BottomSheet
        open={open}
        title="Ajouter un aliment"
        description="Choisissez une méthode"
        onClose={close}
        footer={<button type="button">Continuer</button>}
      >
        <button type="button">Rechercher</button>
      </BottomSheet>
    </>
  );
}

describe('BottomSheet', () => {
  it('piège le focus, ferme avec Échap et restaure le déclencheur', () => {
    const onClose = vi.fn();
    render(<BottomSheetHarness onClose={onClose} />);

    const trigger = screen.getByRole('button', { name: 'Ouvrir les méthodes d’ajout' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Ajouter un aliment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fermer' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('ferme depuis le fond sans absorber les actions du contenu', () => {
    const onClose = vi.fn();
    render(<BottomSheetHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les méthodes d’ajout' }));

    fireEvent.mouseDown(screen.getByRole('dialog', { name: 'Ajouter un aliment' }));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = screen.getByRole('dialog', { name: 'Ajouter un aliment' }).parentElement;
    if (!backdrop) throw new Error('Fond du panneau absent.');
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
