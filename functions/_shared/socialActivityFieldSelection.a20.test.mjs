import { describe, expect, it } from 'vitest';

import {
  LEGACY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION,
  SUMMARY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION,
  intersectSocialActivityFieldSelections,
  sanitizeSocialActivityPermissionFieldSelection,
  socialActivityFieldSelectionIsSubset,
  socialActivityPermissionFieldSelectionFromStored,
} from './socialActivityFieldSelection.js';

describe('socialActivityFieldSelection A20', () => {
  it('normalise les champs obligatoires et leurs dépendances', () => {
    expect(sanitizeSocialActivityPermissionFieldSelection({
      common: [],
      cardio: ['chart'],
      strength: ['loads'],
    })).toEqual({
      common: ['activityType', 'date'],
      cardio: ['chart', 'paceSeries', 'pace'],
      strength: ['loads', 'exercises', 'sets'],
    });
  });

  it('préserve le standard détaillé pour les anciennes permissions sans sélection', () => {
    expect(socialActivityPermissionFieldSelectionFromStored(undefined)).toEqual(
      LEGACY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION,
    );
  });

  it('dégrade une valeur stockée corrompue vers le résumé prudent', () => {
    expect(socialActivityPermissionFieldSelectionFromStored('{invalid')).toEqual(
      SUMMARY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION,
    );
  });

  it('calcule une intersection sans réintroduire un champ non autorisé', () => {
    expect(intersectSocialActivityFieldSelections(
      {
        common: ['activityType', 'title', 'date', 'duration', 'calories'],
        cardio: ['distance', 'pace', 'speed'],
        strength: ['exercises', 'sets', 'repetitions', 'loads'],
      },
      {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance'],
        strength: ['exercises', 'sets', 'repetitions'],
      },
    )).toEqual({
      common: ['activityType', 'date', 'duration'],
      cardio: ['distance'],
      strength: ['exercises', 'sets', 'repetitions'],
    });
  });

  it('refuse qu’un snapshot dépasse la sélection de son destinataire', () => {
    expect(socialActivityFieldSelectionIsSubset(
      {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance', 'pace'],
        strength: [],
      },
      {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance'],
        strength: [],
      },
    )).toBe(false);
  });
});
