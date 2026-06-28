import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';

describe('CollapsibleSection persistante', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('mémorise son état ouvert sur l’appareil', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <CollapsibleSection
        title="Objectifs"
        storageKey="test:objectives"
      >
        <button type="button">Modifier</button>
      </CollapsibleSection>,
    );

    await user.click(
      screen.getByText('Objectifs'),
    );

    expect(
      window.localStorage.getItem('test:objectives'),
    ).toBe('open');

    unmount();

    render(
      <CollapsibleSection
        title="Objectifs"
        storageKey="test:objectives"
      >
        <button type="button">Modifier</button>
      </CollapsibleSection>,
    );

    expect(
      screen.getByRole('button', {
        name: 'Modifier',
      }),
    ).toBeVisible();
  });

  it('s’ouvre lorsqu’un lien profond cible son identifiant', () => {
    window.history.replaceState(
      null,
      '',
      '#settings-themes',
    );

    render(
      <CollapsibleSection
        sectionId="settings-themes"
        title="Thèmes"
      >
        <p>Contenu des thèmes</p>
      </CollapsibleSection>,
    );

    expect(
      screen.getByText('Contenu des thèmes'),
    ).toBeVisible();
  });
});
