import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ContextHelp } from '@/shared/ui/ContextHelp';

describe('ContextHelp', () => {
  it('ouvre une aide ancrée dans un portail puis la ferme avec Échap', async () => {
    const user = userEvent.setup();
    render(
      <ContextHelp question="Pourquoi cette valeur ?">
        Cette valeur adapte le suivi.
      </ContextHelp>,
    );
    const trigger = screen.getByRole('button', { name: 'Pourquoi cette valeur ?' });

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Pourquoi cette valeur ?' })).toBeVisible();
    expect(screen.getByText('Cette valeur adapte le suivi.')).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('ne laisse qu’une aide ouverte à la fois', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ContextHelp question="Première aide">Premier contenu</ContextHelp>
        <ContextHelp question="Deuxième aide">Deuxième contenu</ContextHelp>
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Première aide' }));
    expect(screen.getByText('Premier contenu')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Deuxième aide' }));
    expect(screen.queryByText('Premier contenu')).not.toBeInTheDocument();
    expect(screen.getByText('Deuxième contenu')).toBeVisible();
  });

  it('se ferme lors d’un clic extérieur', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ContextHelp question="Aide">Contenu</ContextHelp>
        <button type="button">Ailleurs</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Aide' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Ailleurs' }));

    expect(screen.queryByText('Contenu')).not.toBeInTheDocument();
  });

  it('se repositionne au-dessus et reste dans un écran de 320 px', async () => {
    const user = userEvent.setup();
    const rect = (
      x: number,
      y: number,
      width: number,
      height: number,
    ): DOMRect => ({
      x,
      y,
      width,
      height,
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
      toJSON: () => ({}),
    });
    const previousWidth = window.innerWidth;
    const previousHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function getRect(this: HTMLElement) {
        return this.getAttribute('role') === 'dialog'
          ? rect(0, 0, 296, 160)
          : rect(270, 450, 44, 44);
      },
    );

    try {
      render(<ContextHelp iconOnly question="Aide mobile">Contenu</ContextHelp>);
      await user.click(screen.getByRole('button', { name: 'Aide mobile' }));
      const dialog = screen.getByRole('dialog', { name: 'Aide mobile' });

      expect(dialog).toHaveStyle({ top: '282px', left: '12px' });
      expect(dialog.parentElement).toBe(document.body);
    } finally {
      rectSpy.mockRestore();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: previousHeight });
    }
  });
});
