import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import type { WeightEntry } from '@/domain/models/weight';
import { WeightHistoryEntryCard } from '@/features/weight/components/WeightHistoryEntryCard';

const entry: WeightEntry = {
  id: 'weight-1',
  date: '2026-06-25',
  weightKg: 61,
  note: 'Pesée au réveil',
  createdAt: '2026-06-25T08:00:00.000Z',
  updatedAt: '2026-06-25T08:00:00.000Z',
};

const originalInnerWidth = window.innerWidth;

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalInnerWidth,
  });
});

describe('WeightHistoryEntryCard', () => {
  it('ouvre la modification depuis la carte et affiche la variation', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <WeightHistoryEntryCard
        entry={entry}
        previousWeightKg={60.5}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('+0,5 kg depuis la précédente')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /jeudi 25 juin 2026/i }));
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it('rend les actions dans une couche au-dessus des pesées suivantes', async () => {
    const user = userEvent.setup();

    render(
      <WeightHistoryEntryCard
        entry={entry}
        previousWeightKg={undefined}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Actions pour la pesée/i }));

    const menu = screen.getByRole('menu', { name: /Actions pour la pesée/i });
    const popover = menu.parentElement;
    expect(popover?.parentElement).toBe(document.body);
    expect(popover).toHaveClass('fixed', 'z-[120]');

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.queryByRole('menu', { name: /Actions pour la pesée/i })).not.toBeInTheDocument();
  });

  it('regroupe la suppression dans les actions secondaires', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <WeightHistoryEntryCard
        entry={entry}
        previousWeightKg={undefined}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Actions pour la pesée/i }));
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onDelete).toHaveBeenCalledWith(entry);
  });
});
