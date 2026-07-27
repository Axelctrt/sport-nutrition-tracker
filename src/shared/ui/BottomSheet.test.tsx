import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import { BottomSheet } from '@/shared/ui/BottomSheet';

function BottomSheetHarness({
  dismissible = true,
  onClose = vi.fn(),
}: {
  dismissible?: boolean;
  onClose?: () => void;
}) {
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
        dismissible={dismissible}
        footer={<button type="button">Continuer</button>}
      >
        <div className="h-[60rem]">
          <button type="button">Rechercher</button>
        </div>
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

  it('conserve le footer hors de la zone scrollable', () => {
    render(<BottomSheetHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les méthodes d’ajout' }));

    const dialog = screen.getByRole('dialog');
    const content = dialog.querySelector('[data-bottom-sheet-content]');
    const footer = dialog.querySelector('[data-bottom-sheet-footer]');

    expect(dialog).toHaveClass('flex', 'flex-col', 'overflow-hidden');
    expect(content).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(footer).toHaveClass('shrink-0');
    expect(footer).toHaveClass('pb-[max(0.75rem,env(safe-area-inset-bottom))]');
  });

  it('reste ouvert après un glissement court et revient en place', () => {
    const onClose = vi.fn();
    render(<BottomSheetHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les méthodes d’ajout' }));

    const dialog = screen.getByRole('dialog');
    const handle = dialog.querySelector<HTMLElement>('[data-bottom-sheet-drag-handle]');
    if (!handle) throw new Error('Poignée absente.');

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientY: 100,
      timeStamp: 0,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientY: 120,
      timeStamp: 300,
    });
    expect(dialog).toHaveStyle({ transform: 'translateY(20px)' });
    fireEvent.pointerUp(handle, {
      pointerId: 1,
      clientY: 120,
      timeStamp: 400,
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toHaveStyle({ transform: 'translateY(0px)' });
  });

  it('ferme après un glissement suffisamment long', () => {
    const onClose = vi.fn();
    render(<BottomSheetHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les méthodes d’ajout' }));

    const handle = screen.getByRole('dialog')
      .querySelector<HTMLElement>('[data-bottom-sheet-drag-handle]');
    if (!handle) throw new Error('Poignée absente.');
    fireEvent.pointerDown(handle, {
      pointerId: 2,
      isPrimary: true,
      button: 0,
      clientY: 100,
      timeStamp: 0,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 2,
      clientY: 220,
      timeStamp: 500,
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ferme après un geste descendant court et rapide', () => {
    const onClose = vi.fn();
    render(<BottomSheetHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les méthodes d’ajout' }));

    const handle = screen.getByRole('dialog')
      .querySelector<HTMLElement>('[data-bottom-sheet-drag-handle]');
    if (!handle) throw new Error('Poignée absente.');
    fireEvent.pointerDown(handle, {
      pointerId: 3,
      isPrimary: true,
      button: 0,
      clientY: 100,
      timeStamp: 0,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 3,
      clientY: 140,
      timeStamp: 40,
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignore un glissement vers le haut et le scroll du contenu', () => {
    const onClose = vi.fn();
    render(<BottomSheetHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les méthodes d’ajout' }));

    const dialog = screen.getByRole('dialog');
    const handle = dialog.querySelector<HTMLElement>('[data-bottom-sheet-drag-handle]');
    const content = dialog.querySelector<HTMLElement>('[data-bottom-sheet-content]');
    if (!handle || !content) throw new Error('Structure du panneau absente.');

    fireEvent.pointerDown(handle, {
      pointerId: 4,
      isPrimary: true,
      button: 0,
      clientY: 160,
      timeStamp: 0,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 4,
      clientY: 80,
      timeStamp: 100,
    });
    fireEvent.pointerDown(content, {
      pointerId: 5,
      isPrimary: true,
      button: 0,
      clientY: 100,
    });
    fireEvent.pointerUp(content, { pointerId: 5, clientY: 250 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('désactive totalement le geste lorsque le panneau ne peut pas être fermé', () => {
    const onClose = vi.fn();
    render(<BottomSheetHarness dismissible={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les méthodes d’ajout' }));

    const dialog = screen.getByRole('dialog');
    const handle = dialog.querySelector<HTMLElement>('[data-bottom-sheet-drag-handle]');
    if (!handle) throw new Error('Poignée absente.');
    fireEvent.pointerDown(handle, {
      pointerId: 6,
      isPrimary: true,
      button: 0,
      clientY: 100,
      timeStamp: 0,
    });
    fireEvent.pointerUp(handle, {
      pointerId: 6,
      clientY: 300,
      timeStamp: 300,
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toHaveStyle({ transform: 'translateY(0px)' });
    expect(dialog).toHaveClass('motion-reduce:transition-none');
  });
});
