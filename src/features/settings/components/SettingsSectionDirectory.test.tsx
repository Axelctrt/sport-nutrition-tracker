import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calculator, Palette } from 'lucide-react';

import { SettingsSectionDirectory } from '@/features/settings/components/SettingsSectionDirectory';

describe('SettingsSectionDirectory', () => {
  it('filtre les rubriques sans tenir compte des accents', async () => {
    const user = userEvent.setup();

    render(
      <SettingsSectionDirectory
        sections={[
          {
            id: 'theme',
            label: 'Thèmes visuels',
            description: 'Palettes débloquées.',
            keywords: ['apparence'],
            icon: Palette,
          },
          {
            id: 'energy',
            label: 'Dépense énergétique',
            description: 'Calories et coefficients.',
            icon: Calculator,
          },
        ]}
      />,
    );

    await user.type(
      screen.getByRole('searchbox', {
        name: 'Rechercher dans les paramètres',
      }),
      'theme',
    );

    expect(
      screen.getByRole('button', {
        name: /Thèmes visuels/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /Dépense énergétique/,
      }),
    ).not.toBeInTheDocument();
  });

  it('ouvre une section depuis le sommaire', async () => {
    const user = userEvent.setup();
    const target = document.createElement('details');
    target.id = 'theme';
    target.scrollIntoView = vi.fn();
    document.body.append(target);

    render(
      <SettingsSectionDirectory
        sections={[
          {
            id: 'theme',
            label: 'Thèmes visuels',
            description: 'Palettes débloquées.',
            icon: Palette,
          },
        ]}
      />,
    );

    window.history.replaceState({}, '', '/#/settings');

    await user.click(
      screen.getByRole('button', {
        name: /Thèmes visuels/,
      }),
    );

    expect(window.location.hash).toBe('#/settings');
    expect(target.open).toBe(true);

    await waitFor(() => {
      expect(target.scrollIntoView).toHaveBeenCalled();
    });

    target.remove();
  });

  it('peut viser le centre unifié et prévenir la page avant le défilement', async () => {
    const user = userEvent.setup();
    const onOpenSection = vi.fn();
    const parent = document.createElement('details');
    parent.id = 'settings-sync';
    const center = document.createElement('div');
    center.id = 'unified-sync-center';
    center.scrollIntoView = vi.fn();
    parent.append(center);
    document.body.append(parent);

    render(
      <SettingsSectionDirectory
        sections={[
          {
            id: 'settings-sync',
            focusId: 'unified-sync-center',
            label: 'Synchronisation des données',
            description: 'Centre de synchronisation.',
            icon: Calculator,
          },
        ]}
        onOpenSection={onOpenSection}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: /Synchronisation des données/,
      }),
    );

    expect(onOpenSection).toHaveBeenCalledWith('settings-sync');
    expect(parent.open).toBe(true);
    await waitFor(() => {
      expect(center.scrollIntoView).toHaveBeenCalled();
    });

    parent.remove();
  });

  it('distingue un annuaire indisponible sans proposer de faux reset', () => {
    render(<SettingsSectionDirectory sections={[]} />);

    expect(
      screen
        .getByRole('heading', { name: 'Aucune rubrique disponible' })
        .closest('[data-empty-state-variant]'),
    ).toHaveAttribute('data-empty-state-variant', 'unavailable');
    expect(
      screen.queryByRole('button', { name: 'Effacer la recherche' }),
    ).not.toBeInTheDocument();
  });

  it('rend une recherche vide réinitialisable sans ouvrir de rubrique', async () => {
    const user = userEvent.setup();
    const onOpenSection = vi.fn();
    const sections = [
      {
        id: 'theme',
        label: 'Thèmes visuels',
        description: 'Palettes débloquées.',
        icon: Palette,
      },
      {
        id: 'energy',
        label: 'Dépense énergétique',
        description: 'Calories et coefficients.',
        icon: Calculator,
      },
    ];
    render(
      <SettingsSectionDirectory
        sections={sections}
        onOpenSection={onOpenSection}
      />,
    );
    const search = screen.getByRole('searchbox', {
      name: 'Rechercher dans les paramètres',
    });

    await user.type(search, 'introuvable');

    expect(
      screen
        .getByRole('heading', { name: 'Aucune rubrique trouvée' })
        .closest('[data-empty-state-variant]'),
    ).toHaveAttribute('data-empty-state-variant', 'filtered');

    await user.click(
      screen.getByRole('button', { name: 'Effacer la recherche' }),
    );

    expect(search).toHaveValue('');
    expect(screen.getAllByRole('button')).toHaveLength(sections.length);
    expect(onOpenSection).not.toHaveBeenCalled();
  });
});
