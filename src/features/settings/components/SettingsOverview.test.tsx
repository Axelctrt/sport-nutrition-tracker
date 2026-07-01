import { render, screen } from '@testing-library/react';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { createDefaultDataSpaceRegistry } from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { SettingsOverview } from '@/features/settings/components/SettingsOverview';

describe('SettingsOverview', () => {
  it('affiche le thème, le stockage et les limites principales', () => {
    const settings = createDefaultAppSettings();
    const activeDataSpace = createDefaultDataSpaceRegistry(
      '2026-07-01T08:00:00.000Z',
    ).spaces[0]!;
    render(
      <SettingsOverview
        settings={{ ...settings, theme: 'dark' }}
        storageStatus="persisted"
        activeDataSpace={activeDataSpace}
      />,
    );

    expect(screen.getByLabelText('Résumé des paramètres')).toBeInTheDocument();
    expect(screen.getByText('0.20.1')).toBeInTheDocument();
    expect(screen.getByText('Sombre')).toBeInTheDocument();
    expect(screen.getByText('Persistant')).toBeInTheDocument();
    expect(screen.getByText('Espace local invité')).toBeInTheDocument();
    expect(screen.getByText(/3[\s ]000/)).toBeInTheDocument();
    expect(screen.getByText('±100 kcal/j')).toBeInTheDocument();
  });
});
