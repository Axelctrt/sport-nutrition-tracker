import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { WorkoutTemplateCard } from '@/features/strength-templates/components/WorkoutTemplateCard';
import { createWorkoutTemplateSummary } from '@/test/factories/strengthUxFactory';

describe('WorkoutTemplateCard', () => {
  it('met le démarrage en avant et révèle progressivement les détails', async () => {
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

    expect(screen.queryByText('Pectoraux, épaules et triceps.')).not.toBeInTheDocument();
    expect(screen.queryByText('Rester à RPE 8 maximum.')).not.toBeInTheDocument();

    const expand = screen.getByRole('button', { name: 'Afficher les détails de Push A' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    await user.click(expand);

    const details = screen.getByRole('region', { name: /Push A/i });
    expect(details).toHaveTextContent('Pectoraux, épaules et triceps.');
    expect(details).toHaveTextContent('Rester à RPE 8 maximum.');
    expect(screen.getByRole('button', { name: 'Masquer les détails de Push A' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: 'Démarrer la séance' }));
    expect(onStart).toHaveBeenCalledWith('template-1');
    expect(screen.getByRole('button', { name: 'Actions pour Push A' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu', { name: 'Actions pour Push A' })).not.toBeInTheDocument();
  });

  it('sépare l’archivage des actions neutres et demande confirmation', async () => {
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
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Modifier',
      'Dupliquer',
      'Archiver',
    ]);
    expect(screen.getByRole('separator')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Archiver' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Archiver cette séance modèle ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Archiver' }));

    await waitFor(() => expect(onArchiveChange).toHaveBeenCalledWith('template-1', true));
    expect(screen.queryByText('Pectoraux, épaules et triceps.')).not.toBeInTheDocument();
  });
});
