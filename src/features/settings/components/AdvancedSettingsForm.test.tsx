import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { AdvancedSettingsForm } from '@/features/settings/components/AdvancedSettingsForm';
import { settingsToFormValues } from '@/features/settings/utils/settingsForm';

describe('AdvancedSettingsForm', () => {
  it('présente les réglages techniques dans des sections repliables', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AdvancedSettingsForm
        initialValues={settingsToFormValues(createDefaultAppSettings())}
        onSubmit={vi.fn()}
        onResetToDefaults={vi.fn()}
      />,
    );

    const calculationTitle = screen.getAllByText('Dépense quotidienne et activités')[0]!;
    const calculationSection = calculationTitle.closest('details');
    expect(calculationSection).not.toHaveAttribute('open');

    await user.click(calculationTitle);
    expect(calculationSection).toHaveAttribute('open');
    expect(container.querySelector('#runningKcalPerKgPerKm')).toHaveAttribute('inputmode', 'decimal');
    expect(container.querySelector('#includedBaseSteps')).toHaveAttribute('inputmode', 'numeric');
  });

  it('demande une confirmation avant de rétablir les valeurs par défaut', async () => {
    const user = userEvent.setup();
    const defaults = settingsToFormValues(createDefaultAppSettings());
    const onResetToDefaults = vi.fn().mockResolvedValue(defaults);

    render(
      <AdvancedSettingsForm
        initialValues={defaults}
        onSubmit={vi.fn()}
        onResetToDefaults={onResetToDefaults}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onResetToDefaults).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Rétablir' }));
    expect(onResetToDefaults).toHaveBeenCalledTimes(1);
  });
  it('peut limiter le formulaire à une catégorie sans afficher la réinitialisation globale', () => {
    render(
      <AdvancedSettingsForm
        initialValues={settingsToFormValues(createDefaultAppSettings())}
        onSubmit={vi.fn()}
        onResetToDefaults={vi.fn()}
        visibleSections={['rest-timer']}
        showResetToDefaults={false}
      />,
    );

    expect(screen.getByText('Minuteur de repos')).toBeInTheDocument();
    expect(screen.queryByText('Dépense quotidienne et activités')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rétablir les valeurs par défaut' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer les paramètres' })).toBeInTheDocument();
  });

});
