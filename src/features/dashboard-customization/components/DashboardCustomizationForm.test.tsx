import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDefaultDashboardPreferences } from '@/domain/dashboard/dashboardPreferences';
import { DashboardCustomizationForm } from '@/features/dashboard-customization/components/DashboardCustomizationForm';

describe('DashboardCustomizationForm', () => {
  it('enregistre la densité, les métriques et un seul bloc complémentaire', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <DashboardCustomizationForm
        initialPreferences={createDefaultDashboardPreferences()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('radio', { name: /Aucun/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Compact/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Poids actuel' }));
    await user.click(screen.getByRole('radio', { name: /Accomplissements/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: 'custom',
        summaryMetrics: ['macros', 'steps', 'weight'],
        supplementalBlock: 'achievements',
      }),
      'compact',
    );
    expect(screen.getByRole('radio', { name: /Progression de la semaine/ }))
      .not.toBeChecked();
    expect(screen.queryByText('Disposition recommandée')).not.toBeInTheDocument();
    expect(screen.queryByText('Blocs secondaires')).not.toBeInTheDocument();
  });

  it('rétablit l’affichage recommandé', async () => {
    const user = userEvent.setup();
    render(
      <DashboardCustomizationForm
        initialPreferences={{
          ...createDefaultDashboardPreferences(),
          summaryMetrics: ['weight'],
          supplementalBlock: 'weeklyProgress',
        }}
        initialDensity="compact"
        onSubmit={() => undefined}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Rétablir l’affichage recommandé' }),
    );

    expect(screen.getByRole('radio', { name: /Confortable/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Macronutriments' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pas du jour' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Poids actuel' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Aucun/ })).toBeChecked();
  });
});
