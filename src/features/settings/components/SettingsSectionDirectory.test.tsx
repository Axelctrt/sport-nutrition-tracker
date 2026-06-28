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

    await user.click(
      screen.getByRole('button', {
        name: /Thèmes visuels/,
      }),
    );

    expect(window.location.hash).toBe('#theme');
    expect(target.open).toBe(true);

    await waitFor(() => {
      expect(target.scrollIntoView).toHaveBeenCalled();
    });

    target.remove();
  });
});
