import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import {
  DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
  DEFAULT_SOCIAL_ACTIVITY_GLOBAL_SHARING_POLICY,
  type SocialActivityGlobalSharingPolicy,
  type SocialActivitySharingOverride,
} from '@/domain/friends/socialActivitySharingPolicy';
import {
  SocialActivityFriendFieldSelectionSettings,
  SocialActivityGlobalSharingSettings,
  SocialActivityOverrideSettings,
} from '@/features/friends/components/SocialActivitySharingSettings';

function GlobalHarness() {
  const [value, setValue] = useState<SocialActivityGlobalSharingPolicy>(
    DEFAULT_SOCIAL_ACTIVITY_GLOBAL_SHARING_POLICY,
  );
  return <SocialActivityGlobalSharingSettings value={value} onChange={setValue} />;
}

function OverrideHarness() {
  const [value, setValue] = useState<SocialActivitySharingOverride>({ mode: 'inherit' });
  return <SocialActivityOverrideSettings family="strength" value={value} onChange={setValue} />;
}

describe('SocialActivitySharingSettings', () => {
  it('permet de choisir une politique globale personnalisée sans proposer les notes privées', async () => {
    const user = userEvent.setup();
    render(<GlobalHarness />);

    await user.click(screen.getByRole('button', { name: 'Personnalisé' }));

    expect(screen.getByLabelText('Calories')).toBeInTheDocument();
    expect(screen.getByLabelText('Charges')).toBeInTheDocument();
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/restent toujours privés/u)).toBeInTheDocument();
  });

  it('limite les champs personnalisés à la famille musculation pour une séance', async () => {
    const user = userEvent.setup();
    render(<OverrideHarness />);

    await user.click(screen.getByRole('button', { name: 'Personnalisée' }));

    expect(screen.getByLabelText('Charges')).toBeInTheDocument();
    expect(screen.queryByLabelText('Distance')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personnalisée' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('enregistre une sélection propre à un ami sans proposer les notes privées', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SocialActivityFriendFieldSelectionSettings
        friendDisplayName="Lina"
        value={DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByText(/Choisir les informations partagées avec Lina/u));
    expect(screen.getByLabelText('Charges')).toBeChecked();
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Charges'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les champs' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0].strength).not.toContain('loads');
  });

  it('réinitialise les champs d’un ami vers le standard détaillé', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SocialActivityFriendFieldSelectionSettings
        friendDisplayName="Lina"
        value={{
          common: ['activityType', 'date', 'duration'],
          cardio: ['distance'],
          strength: ['exercises', 'sets', 'repetitions'],
        }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByText(/Choisir les informations partagées avec Lina/u));
    await user.click(screen.getByRole('button', { name: 'Réinitialiser le standard' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les champs' }));

    expect(onSave.mock.calls[0]?.[0]).toEqual(DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION);
  });

});
