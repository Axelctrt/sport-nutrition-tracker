import viteConfigSource from '../../vite.config.ts?raw';
import databaseRuntimeSource from '../infrastructure/database/database.ts?raw';
import databaseNamesSource from '../infrastructure/database/databaseNames.ts?raw';

describe('identité persistante de la PWA', () => {
  it('conserve le même identifiant, point de départ et périmètre', () => {
    expect(viteConfigSource).toContain("id: './'");
    expect(viteConfigSource).toContain("start_url: './'");
    expect(viteConfigSource).toContain("scope: './'");
    expect(viteConfigSource).toContain("registerType: 'prompt'");
  });

  it('conserve le nom public de la base invitée IndexedDB', () => {
    expect(databaseNamesSource).toMatch(
      /export const DEFAULT_DATABASE_NAME = ["']sportpilot-local-database["'];/,
    );
    expect(databaseRuntimeSource).toContain(
      'new AppDatabase(activeDataSpace.databaseName)',
    );
  });
});
