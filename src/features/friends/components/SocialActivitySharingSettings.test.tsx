import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import {
  ALL_SOCIAL_ACTIVITY_FIELD_SELECTION,
  DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
} from '@/domain/friends/socialActivitySharingPolicy';
import { SocialActivityFriendSharingSettings } from '@/features/friends/components/SocialActivitySharingSettings';

describe('SocialActivityFriendSharingSettings', () => {
  it('présente un réglage compact centré sur l’ami et une colonne sur mobile', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SocialActivityFriendSharingSettings
        friendDisplayName="Lina"
        sharingLevel="summary"
        value={DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION}
        onSharingLevelChange={vi.fn()}
        onSaveFields={vi.fn()}
      />,
    );

    expect(screen.getByText('Partage : Résumé')).toBeInTheDocument();
    expect(screen.getByText('Partage : Résumé').closest('details')).not.toHaveAttribute('open');

    await user.click(screen.getByText('Partage : Résumé'));

    const modeGrid = container.querySelector('[data-sharing-mode-grid]');
    expect(modeGrid).toHaveClass('grid', 'grid-cols-1', 'gap-2', 'sm:grid-cols-3');
    expect(screen.getByRole('radio', { name: 'Aucun' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Résumé' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Personnalisé' })).toBeInTheDocument();
  });

  it('permet de désactiver tout partage pour un ami', async () => {
    const user = userEvent.setup();
    const onSharingLevelChange = vi.fn();
    render(
      <SocialActivityFriendSharingSettings
        friendDisplayName="Lina"
        sharingLevel="summary"
        value={DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION}
        onSharingLevelChange={onSharingLevelChange}
        onSaveFields={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Partage : Résumé'));
    await user.click(screen.getByRole('radio', { name: 'Aucun' }));

    expect(onSharingLevelChange).toHaveBeenCalledWith('none');
  });

  it('expose le choix exclusif au clavier avec les flèches', async () => {
    const user = userEvent.setup();
    const onSharingLevelChange = vi.fn();
    render(
      <SocialActivityFriendSharingSettings
        friendDisplayName="Lina"
        sharingLevel="summary"
        value={DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION}
        onSharingLevelChange={onSharingLevelChange}
        onSaveFields={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Partage : Résumé'));
    const summary = screen.getByRole('radio', { name: 'Résumé' });
    summary.focus();
    await user.keyboard('{ArrowRight}');

    expect(onSharingLevelChange).toHaveBeenCalledWith('detailed');
  });

  it('regroupe les champs personnalisés dans deux rubriques compactes', async () => {
    const user = userEvent.setup();
    render(
      <SocialActivityFriendSharingSettings
        friendDisplayName="Lina"
        sharingLevel="detailed"
        value={DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION}
        onSharingLevelChange={vi.fn()}
        onSaveFields={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Partage : Personnalisé'));

    expect(screen.getByText('Musculation')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
    expect(screen.queryByLabelText('Graphique')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();

    await user.click(screen.getByText('Musculation'));
    expect(screen.getByLabelText(/RPE des séries/u)).toBeInTheDocument();
    expect(screen.getByText(/uniquement lorsqu’il est renseigné/u)).toBeInTheDocument();

    await user.click(screen.getByText('Cardio'));
    expect(screen.getByLabelText(/Calories/u)).toBeInTheDocument();
    expect(screen.getByText(/uniquement lorsqu’elles sont calculées/u)).toBeInTheDocument();
  });

  it('enregistre une sélection propre à un ami et retire les anciens champs invisibles', async () => {
    const user = userEvent.setup();
    const onSaveFields = vi.fn();
    render(
      <SocialActivityFriendSharingSettings
        friendDisplayName="Lina"
        sharingLevel="detailed"
        value={ALL_SOCIAL_ACTIVITY_FIELD_SELECTION}
        onSharingLevelChange={vi.fn()}
        onSaveFields={onSaveFields}
      />,
    );

    await user.click(screen.getByText('Partage : Personnalisé'));
    await user.click(screen.getByText('Musculation'));

    const strengthGroup = screen.getByText('Musculation').closest('details');
    expect(strengthGroup).not.toBeNull();
    await user.click(within(strengthGroup!).getByLabelText('Charges'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSaveFields).toHaveBeenCalledTimes(1);
    const selection = onSaveFields.mock.calls[0]?.[0];
    expect(selection.strength).not.toContain('loads');
    expect(selection.strength).not.toContain('bodyweight');
    expect(selection.cardio).not.toContain('chart');
    expect(selection.cardio).not.toContain('paceSeries');
    expect(selection.cardio).not.toContain('sessionType');
    expect(selection.common).not.toContain('intensity');
    expect(selection.common).toEqual(expect.arrayContaining(['activityType', 'title', 'date', 'duration']));
  });
});
