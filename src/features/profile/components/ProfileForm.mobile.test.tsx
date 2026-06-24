import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';

afterEach(cleanup);

describe('ProfileForm sur mobile', () => {
  it('configure les champs numériques pour les claviers mobiles', () => {
    render(
      <ProfileForm
        initialValues={DEFAULT_PROFILE_FORM_VALUES}
        submitLabel="Enregistrer le profil"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Taille en centimètres/)).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText(/Poids actuel en kilogrammes/)).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText(/Objectif quotidien de pas/)).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText(/Protéines en g\/kg/)).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText(/Lipides en g\/kg/)).toHaveAttribute('enterkeyhint', 'done');
    expect(screen.getByRole('button', { name: 'Enregistrer le profil' })).toHaveClass('w-full');
  });

  it('accepte une virgule comme séparateur décimal', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ProfileForm
        initialValues={DEFAULT_PROFILE_FORM_VALUES}
        submitLabel="Enregistrer le profil"
        onSubmit={onSubmit}
      />,
    );

    const proteinInput = screen.getByLabelText(/Protéines en g\/kg/);
    await user.clear(proteinInput);
    await user.type(proteinInput, '1,9');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ proteinGramsPerKg: 1.9 }),
    );
  });
});
