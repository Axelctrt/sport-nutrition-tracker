import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { WorkoutTemplateCard } from '@/features/strength-templates/components/WorkoutTemplateCard';
import { createWorkoutTemplateSummary } from '@/test/factories/strengthUxFactory';

describe('WorkoutTemplateCard', () => {
  it('met le démarrage en avant et replie les actions secondaires', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <WorkoutTemplateCard
          summary={createWorkoutTemplateSummary()}
          onStart={onStart}
          onDuplicate={vi.fn().mockResolvedValue(undefined)}
          onArchiveChange={vi.fn().mockResolvedValue(true)}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Démarrer la séance' }));
    expect(onStart).toHaveBeenCalledWith('template-1');
    expect(screen.getByRole('button', { name: 'Actions pour Push A' }).closest('details')).not.toHaveAttribute('open');
  });

  it('confirme l’archivage', async () => {
    const user = userEvent.setup();
    const onArchiveChange = vi.fn().mockResolvedValue(true);
    render(
      <MemoryRouter>
        <WorkoutTemplateCard
          summary={createWorkoutTemplateSummary()}
          onStart={vi.fn().mockResolvedValue(undefined)}
          onDuplicate={vi.fn().mockResolvedValue(undefined)}
          onArchiveChange={onArchiveChange}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Actions pour Push A' }));
    await user.click(screen.getByRole('button', { name: 'Archiver' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Archiver cette séance modèle ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Archiver' }));

    await waitFor(() => expect(onArchiveChange).toHaveBeenCalledWith('template-1', true));
  });
});
