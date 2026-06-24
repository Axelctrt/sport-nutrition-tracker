import { describe, expect, it } from 'vitest';

const productionSources = import.meta.glob('/src/**/*.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const forbiddenProductionPhrases = [
  { label: 'référence numérotée à une étape de développement', pattern: /\b[Éé]tape\s+\d+/u },
  { label: 'mention visible du MVP', pattern: /\bMVP\b/u },
  { label: 'mention « prochainement »', pattern: /\bprochainement\b/iu },
  { label: 'marqueur TODO', pattern: /\bTODO\b/u },
] as const;

describe('textes visibles en production', () => {
  it('ne contient plus de références aux étapes de développement', () => {
    const violations = Object.entries(productionSources).flatMap(([filePath, source]) => (
      forbiddenProductionPhrases
        .filter(({ pattern }) => pattern.test(source))
        .map(({ label }) => `${filePath}: ${label}`)
    ));

    expect(violations).toEqual([]);
  });
});
