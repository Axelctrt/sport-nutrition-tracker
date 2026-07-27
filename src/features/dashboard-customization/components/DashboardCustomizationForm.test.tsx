import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDefaultDashboardPreferences } from '@/domain/dashboard/dashboardPreferences';
import { DashboardCustomizationForm } from '@/features/dashboard-customization/components/DashboardCustomizationForm';

describe('DashboardCustomizationForm', () => {
  it('applique un préréglage, masque un bloc, change son ordre puis enregistre', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <DashboardCustomizationForm
        initialPreferences={createDefaultDashboardPreferences()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Entraînement/ }));
    expect(screen.getByRole('button', { name: /Entraînement/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('checkbox', { name: 'Afficher Activités du jour' }));
    expect(screen.getByRole('checkbox', { name: 'Afficher Activités du jour' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Monter Activités du jour' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'custom',
        hidden: expect.arrayContaining(['activities']),
      }),
      'comfortable',
    );
    expect(screen.queryByRole('checkbox', { name: 'Afficher Résumé de la journée' }))
      .not.toBeInTheDocument();
    expect(screen.queryByText('Raccourcis visibles')).not.toBeInTheDocument();
  });

  it('rétablit l’affichage équilibré', async () => {
    const user = userEvent.setup();
    render(
      <DashboardCustomizationForm
        initialPreferences={{
          preset: 'minimal',
          order: ['todaySummary', 'quickActions', 'activeWorkout', 'activities', 'calculationDetails'],
          hidden: ['activities', 'calculationDetails'],
          quickActions: ['addFood', 'steps'],
          summaryMetrics: ['steps', 'weight'],
        }}
        onSubmit={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Rétablir la disposition recommandée' }));

    expect(screen.getByRole('button', { name: /Équilibré/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: 'Afficher Activités du jour' })).toBeChecked();
  });
});
