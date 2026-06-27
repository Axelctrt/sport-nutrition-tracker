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

    await user.click(screen.getByRole('button', { name: 'Monter Résumé de la journée' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      preset: 'custom',
      hidden: expect.arrayContaining(['activities']),
    }));
  });

  it('rétablit l’affichage équilibré', async () => {
    const user = userEvent.setup();
    render(
      <DashboardCustomizationForm
        initialPreferences={{
          preset: 'minimal',
          order: ['todaySummary', 'quickActions', 'activeWorkout', 'activities', 'calculationDetails'],
          hidden: ['activities', 'calculationDetails'],
        }}
        onSubmit={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Rétablir l’affichage équilibré' }));

    expect(screen.getByRole('button', { name: /Équilibré/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: 'Afficher Activités du jour' })).toBeChecked();
  });
});
