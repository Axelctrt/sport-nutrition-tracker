import {
  databaseInternalTableNames,
  databaseTableNames,
} from '@/infrastructure/database/schema';

const inspectedSources = {
  ...import.meta.glob('/src/application/sync/**/*.{ts,tsx}', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
  ...import.meta.glob('/src/infrastructure/sync/**/*.{ts,tsx}', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
  ...import.meta.glob('/functions/api/**/*.{ts,tsx,mjs}', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
  ...import.meta.glob('/src/infrastructure/backup/**/*.{ts,tsx}', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
} as Record<string, string>;

const FORBIDDEN_PATTERNS = [
  /progressPhotos/,
  /progressPhotoAssets/,
  /ProgressPhoto/,
];

describe('contrat local-only des photos de progression', () => {
  it('classe les tables photo comme internes à chaque espace', () => {
    expect(databaseInternalTableNames).toEqual(expect.arrayContaining([
      'progressPhotos',
      'progressPhotoAssets',
    ]));
    expect(databaseTableNames).not.toEqual(expect.arrayContaining([
      'progressPhotos',
      'progressPhotoAssets',
    ]));
  });

  it('n’expose aucune table ou modèle photo aux adaptateurs cloud et à la sauvegarde JSON', () => {
    const violations = Object.entries(inspectedSources).flatMap(([filePath, source]) => (
      FORBIDDEN_PATTERNS
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${filePath}: ${pattern.source}`)
    ));

    expect(violations).toEqual([]);
  });
});
