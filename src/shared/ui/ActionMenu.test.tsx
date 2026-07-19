import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { ActionMenu } from '@/shared/ui/ActionMenu';

function rect(values: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 44,
    height: 44,
    top: 0,
    right: 44,
    bottom: 44,
    left: 0,
    toJSON: () => ({}),
    ...values,
  };
}

const originalInnerHeight = window.innerHeight;
const originalInnerWidth = window.innerWidth;

afterEach(() => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
  vi.restoreAllMocks();
});

describe('ActionMenu', () => {
  it('rend le menu dans un portail au-dessus des cartes puis le ferme après une action', async () => {
    const user = userEvent.setup();
    render(
      <div data-testid="card" className="overflow-hidden">
        <ActionMenu label="Actions pour la séance">
          <button type="button">Modifier</button>
        </ActionMenu>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: 'Actions pour la séance' });
    await user.click(trigger);

    const menu = screen.getByRole('menu', { name: 'Actions pour la séance' });
    expect(menu.parentElement).toBe(document.body);
    expect(menu).toHaveClass('fixed', 'z-[120]');
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.queryByRole('menu', { name: 'Actions pour la séance' })).not.toBeInTheDocument();
  });

  it('place le menu au-dessus du déclencheur lorsqu’il manque de la place en bas', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    render(
      <ActionMenu label="Actions">
        <button type="button">Modifier</button>
        <button type="button">Supprimer</button>
      </ActionMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Actions' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect({
      top: 640,
      bottom: 684,
      left: 330,
      right: 374,
    }));
    await user.click(trigger);

    const menu = screen.getByRole('menu', { name: 'Actions' });
    vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue(rect({ height: 120 }));
    window.dispatchEvent(new Event('resize'));

    await waitFor(() => expect(Number.parseFloat(menu.style.top)).toBeLessThan(640));
    expect(Number.parseFloat(menu.style.left)).toBeGreaterThanOrEqual(8);
  });

  it('se ferme avec Échap et rend le focus au bouton', async () => {
    const user = userEvent.setup();
    render(
      <ActionMenu label="Actions">
        <button type="button">Modifier</button>
      </ActionMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: 'Actions' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
