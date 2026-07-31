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
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|tsx|mjs)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
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
    const violations = sourceFiles(inspectedDirectories[0] ?? '')
      .concat(...inspectedDirectories.slice(1).map(sourceFiles))
      .flatMap((file) => {
        const content = readFileSync(file, 'utf8');
        return FORBIDDEN_PATTERNS
          .filter((pattern) => pattern.test(content))
          .map((pattern) => `${file}: ${pattern.source}`);
      });

    expect(violations).toEqual([]);
  });
});
