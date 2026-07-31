import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  databaseInternalTableNames,
  databaseTableNames,
} from '@/infrastructure/database/schema';

const FORBIDDEN_PATTERNS = [
  /progressPhotos/,
  /progressPhotoAssets/,
  /ProgressPhoto/,
];

function sourceFiles(directory: string): string[] {
  const root = join(process.cwd(), directory);
  if (!existsSync(root)) return [];

  function walk(path: string): string[] {
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
      const next = join(path, entry.name);
      if (entry.isDirectory()) return walk(next);
      return /\.(?:ts|tsx|mjs)$/.test(entry.name) ? [next] : [];
    });
  }

  return walk(root);
}

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
    const inspectedDirectories = [
      'src/application/sync',
      'src/infrastructure/sync',
      'functions/api',
      'src/infrastructure/backup',
    ];
    const violations = inspectedDirectories
      .flatMap(sourceFiles)
      .flatMap((file) => {
        const content = readFileSync(file, 'utf8');
        return FORBIDDEN_PATTERNS
          .filter((pattern) => pattern.test(content))
          .map((pattern) => `${file}: ${pattern.source}`);
      });

    expect(violations).toEqual([]);
  });
});
