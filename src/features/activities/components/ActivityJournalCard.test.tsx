import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ActivityJournalCard } from '@/features/activities/components/ActivityJournalCard';
import { createRunningActivityInput } from '@/test/factories/activityFactory';
import { createEntity } from '@/shared/utils/entities';

const activity = createEntity(createRunningActivityInput({
  notes: 'Bonne séance, jambes légères.',
}), 'activity-running');

function renderCard(overrides?: Partial<React.ComponentProps<typeof ActivityJournalCard>>) {
  const props: React.ComponentProps<typeof ActivityJournalCard> = {
    activity,
    navigationState: {
      activityJournalReturn: {
        path: '/activities?date=2026-06-23',
        date: '2026-06-23',
        scrollKey: 'journal-key',
      },
    },
    onDuplicate: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(true),
    ...overrides,
  };

  render(
    <MemoryRouter>
      <ActivityJournalCard {...props} />
    </MemoryRouter>,
  );

  return props;
}

afterEach(cleanup);

describe('ActivityJournalCard', () => {
  it('affiche une ligne compacte avec les données essentielles', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Footing' })).toBeInTheDocument();
    expect(screen.getByText('8 km')).toBeInTheDocument();
    expect(screen.getByText('50 min')).toBeInTheDocument();
    expect(screen.getByText('480 kcal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Modifier' }).closest('details')).not.toHaveAttribute('open');
  });

  it('regroupe modifier et dupliquer dans le menu secondaire', async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn().mockResolvedValue(undefined);
    renderCard({ onDuplicate });

    await user.click(screen.getByRole('button', { name: 'Actions pour Footing' }));

    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/activities/activity-running/edit',
    );
    await user.click(screen.getByRole('button', { name: 'Dupliquer' }));
    expect(onDuplicate).toHaveBeenCalledWith('activity-running');
  });

  it('demande une confirmation accessible avant la suppression', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(true);
    renderCard({ onRemove });

    await user.click(screen.getByRole('button', { name: 'Actions pour Footing' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer cette activité ?' });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('activity-running'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
