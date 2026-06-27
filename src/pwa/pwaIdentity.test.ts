import viteConfigSource from '../../vite.config.ts?raw';
import databaseSource from '../infrastructure/database/AppDatabase.ts?raw';

describe('identité persistante de la PWA', () => {
  it('conserve le même identifiant, point de départ et périmètre', () => {
    expect(viteConfigSource).toContain("id: './'");
    expect(viteConfigSource).toContain("start_url: './'");
    expect(viteConfigSource).toContain("scope: './'");
    expect(viteConfigSource).toContain("registerType: 'prompt'");
  });

  it('conserve le nom public de la base IndexedDB', () => {
    expect(databaseSource).toMatch(
      /export const DEFAULT_DATABASE_NAME = ["']sportpilot-local-database["'];/,
    );
  });
});
