import { render, screen } from '@testing-library/react';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { SettingsOverview } from '@/features/settings/components/SettingsOverview';

describe('SettingsOverview', () => {
  it('affiche le thème, le stockage et les limites principales', () => {
    const settings = createDefaultAppSettings();
    render(<SettingsOverview settings={{ ...settings, theme: 'dark' }} storageStatus="persisted" />);

    expect(screen.getByLabelText('Résumé des paramètres')).toBeInTheDocument();
    expect(screen.getByText('Sombre')).toBeInTheDocument();
    expect(screen.getByText('Persistant')).toBeInTheDocument();
    expect(screen.getByText(/3[\s ]000/)).toBeInTheDocument();
    expect(screen.getByText('±100 kcal/j')).toBeInTheDocument();
  });
});
