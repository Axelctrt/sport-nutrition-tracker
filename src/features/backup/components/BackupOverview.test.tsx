import { render, screen } from '@testing-library/react';
import { BackupOverview } from '@/features/backup/components/BackupOverview';

describe('BackupOverview', () => {
  it('résume le mode de stockage et le format de sauvegarde', () => {
    render(<BackupOverview storageUsageLabel="2,4 Mo / 1 Go" lastBackupLabel="Il y a 6 jours" />);

    expect(screen.getByLabelText('Résumé des données locales')).toBeInTheDocument();
    expect(screen.getByText('Local')).toBeInTheDocument();
    expect(screen.getByText('JSON v2')).toBeInTheDocument();
    expect(screen.getByText('Il y a 6 jours')).toBeInTheDocument();
    expect(screen.getByText('2,4 Mo / 1 Go')).toBeInTheDocument();
  });
});
