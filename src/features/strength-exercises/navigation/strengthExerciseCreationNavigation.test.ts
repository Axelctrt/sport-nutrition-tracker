import { describe, expect, it } from 'vitest';

import {
  newStrengthExercisePath,
  readStrengthExerciseCreationContext,
  strengthExerciseCreationReturnPath,
} from './strengthExerciseCreationNavigation';

describe('navigation de création d’exercice', () => {
  it('conserve un contexte de séance validé sans objet métier dans l’URL', () => {
    const path = newStrengthExercisePath({
      returnTo: 'session',
      query: 'tirage unilatéral poulie',
      sessionId: 'session-1',
      plannedSets: 4,
    });
    const params = new URLSearchParams(path.split('?')[1]);
    const context = readStrengthExerciseCreationContext(params);
    expect(context).toEqual({
      returnTo: 'session',
      query: 'tirage unilatéral poulie',
      sessionId: 'session-1',
      plannedSets: 4,
    });
    expect(strengthExerciseCreationReturnPath(context!))
      .toBe('/strength/sessions/session-1');
  });

  it('refuse un identifiant ou une clé de brouillon non sûrs', () => {
    expect(readStrengthExerciseCreationContext(new URLSearchParams({
      returnTo: 'template',
      query: 'nouvel exercice',
      templateId: '../danger',
      insertionIndex: '1',
      draftKey: 'not-allowed',
    }))).toBeUndefined();
  });
});
