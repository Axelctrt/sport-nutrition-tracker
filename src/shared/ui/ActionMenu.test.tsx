import { Pencil, Trash2 } from 'lucide-react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import {
  ActionMenu,
  ActionMenuGroup,
  ActionMenuItem,
  ActionMenuLink,
  ActionMenuSeparator,
} from '@/shared/ui/ActionMenu';

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
const originalMatchMedia = window.matchMedia;

function mockViewport(tablet: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === '(min-width: 640px)' ? tablet : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  });
}

afterEach(() => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
  vi.restoreAllMocks();
});

describe('ActionMenu', () => {
  it('rend le popover tablette dans un portail puis le ferme après une action', async () => {
    mockViewport(true);
    const user = userEvent.setup();
    render(
      <div data-testid="card" className="overflow-hidden">
        <ActionMenu label="Actions pour la séance">
          <ActionMenuItem icon={Pencil}>Modifier</ActionMenuItem>
        </ActionMenu>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: 'Actions pour la séance' });
    await user.click(trigger);

    const menu = screen.getByRole('menu', { name: 'Actions pour la séance' });
    expect(menu.parentElement).toHaveClass('fixed', 'z-[120]');
    expect(menu.parentElement?.parentElement).toBe(document.body);
    await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
    expect(screen.queryByRole('menu', { name: 'Actions pour la séance' })).not.toBeInTheDocument();
  });

  it('place le popover au-dessus du déclencheur lorsqu’il manque de la place en bas', async () => {
    mockViewport(true);
    const user = userEvent.setup();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    render(
      <ActionMenu label="Actions">
        <ActionMenuItem>Modifier</ActionMenuItem>
        <ActionMenuItem tone="danger">Supprimer</ActionMenuItem>
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
    const popover = menu.parentElement as HTMLDivElement;
    vi.spyOn(popover, 'getBoundingClientRect').mockReturnValue(rect({ height: 120 }));
    window.dispatchEvent(new Event('resize'));

    await waitFor(() => expect(Number.parseFloat(popover.style.top)).toBeLessThan(640));
    expect(Number.parseFloat(popover.style.left)).toBeGreaterThanOrEqual(8);
  });

  it('se ferme avec Échap et rend le focus au bouton', async () => {
    mockViewport(true);
    const user = userEvent.setup();
    render(
      <ActionMenu label="Actions">
        <ActionMenuItem>Modifier</ActionMenuItem>
      </ActionMenu>,
    );

    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: 'Actions' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('ouvre un Bottom Sheet sur mobile et place le focus sur la première action', async () => {
    mockViewport(false);
    const user = userEvent.setup();
    render(
      <ActionMenu label="Actions pour Push 1">
        <ActionMenuItem icon={Pencil}>Modifier</ActionMenuItem>
        <ActionMenuSeparator />
        <ActionMenuItem icon={Trash2} tone="danger">Archiver</ActionMenuItem>
      </ActionMenu>,
    );

    await user.click(screen.getByRole('button', { name: 'Actions pour Push 1' }));

    expect(
      screen.getByRole('dialog', { name: 'Actions pour Push 1' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menu', { name: 'Actions pour Push 1' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Modifier' })).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Fermer les actions' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Actions pour Push 1' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Actions pour Push 1' })).toHaveFocus());
  });

  it('normalise les lignes, groupes, liens et actions destructives', async () => {
    mockViewport(true);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ActionMenu label="Actions pour une entrée">
          <ActionMenuGroup label="Actions principales">
            <ActionMenuLink to="/modifier" icon={Pencil}>Modifier</ActionMenuLink>
          </ActionMenuGroup>
          <ActionMenuSeparator />
          <ActionMenuGroup label="Zone dangereuse">
            <ActionMenuItem icon={Trash2} tone="danger">Supprimer</ActionMenuItem>
          </ActionMenuGroup>
        </ActionMenu>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Actions pour une entrée' }));

    const edit = screen.getByRole('menuitem', { name: 'Modifier' });
    const remove = screen.getByRole('menuitem', { name: 'Supprimer' });
    expect(edit).toHaveClass('min-h-12', 'w-full');
    expect(remove).toHaveClass('min-h-12', 'text-red-700');
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Actions principales' })).toBeInTheDocument();
  });

  it('permet la navigation par flèches, Début et Fin', async () => {
    mockViewport(true);
    const user = userEvent.setup();
    render(
      <ActionMenu label="Actions">
        <ActionMenuItem>Modifier</ActionMenuItem>
        <ActionMenuItem>Dupliquer</ActionMenuItem>
        <ActionMenuItem tone="danger">Archiver</ActionMenuItem>
      </ActionMenu>,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    const edit = screen.getByRole('menuitem', { name: 'Modifier' });
    const duplicate = screen.getByRole('menuitem', { name: 'Dupliquer' });
    const archive = screen.getByRole('menuitem', { name: 'Archiver' });

    await waitFor(() => expect(edit).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(duplicate).toHaveFocus();
    await user.keyboard('{End}');
    expect(archive).toHaveFocus();
    await user.keyboard('{Home}');
    expect(edit).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(archive).toHaveFocus();
  });
});
