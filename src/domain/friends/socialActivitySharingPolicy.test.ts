import {
  DEFAULT_SOCIAL_ACTIVITY_GLOBAL_SHARING_POLICY,
  EMPTY_SOCIAL_ACTIVITY_FIELD_SELECTION,
  applyFriendScopeToSocialActivitySharingPolicy,
  assertNoForbiddenSocialActivitySourceFields,
  decideSocialActivitySnapshotLifecycleAction,
  findForbiddenSocialActivitySourceFields,
  normalizeSocialActivityFieldSelection,
  resolveSocialActivitySharingPolicy,
  selectSocialActivityFieldsForFamily,
  socialActivityFamilyForType,
  validateSocialActivityGlobalSharingPolicy,
  validateSocialActivitySharingOverride,
  type SocialActivityGlobalSharingPolicy,
} from '@/domain/friends/socialActivitySharingPolicy';

const detailedPolicy: SocialActivityGlobalSharingPolicy = {
  visibility: 'detailed',
  fields: {
    common: ['activityType', 'title', 'date', 'duration', 'calories'],
    cardio: ['distance', 'pace', 'chart', 'heartRate'],
    strength: ['sessionName', 'exercises', 'sets', 'repetitions', 'loads', 'rpe'],
  },
};

describe('social activity sharing policy', () => {
  it('applique le résumé prudent par défaut sans calories ni métriques sensibles', () => {
    const resolved = resolveSocialActivitySharingPolicy(
      DEFAULT_SOCIAL_ACTIVITY_GLOBAL_SHARING_POLICY,
    );

    expect(resolved).toMatchObject({
      source: 'global',
      visibility: 'summary',
      publishSnapshot: true,
      fields: {
        common: ['activityType', 'title', 'date', 'duration'],
        cardio: ['distance'],
        strength: ['sessionName', 'muscleGroups', 'exerciseCount'],
      },
    });
    expect(JSON.stringify(resolved.fields)).not.toContain('calories');
    expect(JSON.stringify(resolved.fields)).not.toContain('heartRate');
    expect(JSON.stringify(resolved.fields)).not.toContain('loads');
  });

  it('priorise une surcharge privée sur le réglage global', () => {
    const resolved = resolveSocialActivitySharingPolicy(detailedPolicy, { mode: 'private' });

    expect(resolved).toMatchObject({
      source: 'activity',
      visibility: 'private',
      publishSnapshot: false,
      fields: EMPTY_SOCIAL_ACTIVITY_FIELD_SELECTION,
    });
  });

  it('conserve exercices, séries et répétitions lorsque les charges sont masquées', () => {
    const resolved = resolveSocialActivitySharingPolicy(detailedPolicy, {
      mode: 'custom',
      fields: {
        common: ['activityType', 'date', 'duration'],
        cardio: [],
        strength: ['exercises', 'repetitions'],
      },
    });

    expect(resolved.fields.strength).toEqual(['exercises', 'repetitions', 'sets']);
    expect(resolved.fields.strength).not.toContain('loads');
  });

  it('ajoute les dépendances nécessaires aux graphiques cardio et aux séries de musculation', () => {
    const normalized = normalizeSocialActivityFieldSelection({
      common: [],
      cardio: ['chart'],
      strength: ['loads'],
    });

    expect(normalized.common).toEqual(['activityType', 'date']);
    expect(normalized.cardio).toEqual(['chart', 'paceSeries', 'pace']);
    expect(normalized.strength).toEqual(['loads', 'exercises', 'sets']);
  });

  it('limite un destinataire résumé sans ajouter un champ absent de la politique propriétaire', () => {
    const ownerPolicy = resolveSocialActivitySharingPolicy(detailedPolicy, {
      mode: 'custom',
      fields: {
        common: ['activityType', 'date'],
        cardio: ['pace'],
        strength: [],
      },
    });
    const recipientPolicy = applyFriendScopeToSocialActivitySharingPolicy(ownerPolicy, 'summary');

    expect(recipientPolicy).toMatchObject({
      visibility: 'summary',
      recipientScope: 'summary',
      permissionLimited: true,
      publishSnapshot: true,
    });
    expect(recipientPolicy.fields).toEqual({
      common: ['activityType', 'date'],
      cardio: [],
      strength: [],
    });
  });

  it('intersecte la politique propriétaire avec les champs choisis pour un ami', () => {
    const ownerPolicy = resolveSocialActivitySharingPolicy(detailedPolicy);
    const recipientPolicy = applyFriendScopeToSocialActivitySharingPolicy(
      ownerPolicy,
      'detailed',
      {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance', 'pace'],
        strength: ['exercises', 'sets', 'repetitions'],
      },
    );

    expect(recipientPolicy).toMatchObject({
      visibility: 'detailed',
      recipientScope: 'detailed',
      permissionLimited: true,
      publishSnapshot: true,
      fields: {
        common: ['activityType', 'date', 'duration'],
        cardio: ['distance', 'pace'],
        strength: ['exercises', 'sets', 'repetitions'],
      },
    });
    expect(recipientPolicy.fields.common).not.toContain('calories');
    expect(recipientPolicy.fields.strength).not.toContain('loads');
  });

  it('bloque entièrement un destinataire sans permission', () => {
    const ownerPolicy = resolveSocialActivitySharingPolicy(detailedPolicy);
    const recipientPolicy = applyFriendScopeToSocialActivitySharingPolicy(ownerPolicy, 'none');

    expect(recipientPolicy).toMatchObject({
      visibility: 'private',
      recipientScope: 'none',
      publishSnapshot: false,
      permissionLimited: true,
      fields: EMPTY_SOCIAL_ACTIVITY_FIELD_SELECTION,
    });
  });

  it('détermine un upsert ou une suppression de snapshot de manière déterministe', () => {
    const shared = resolveSocialActivitySharingPolicy(detailedPolicy);
    const privatePolicy = resolveSocialActivitySharingPolicy(detailedPolicy, { mode: 'private' });

    expect(decideSocialActivitySnapshotLifecycleAction({
      hadPublishedSnapshot: false,
      sourceDeleted: false,
      nextPolicy: shared,
    })).toBe('upsert');
    expect(decideSocialActivitySnapshotLifecycleAction({
      hadPublishedSnapshot: true,
      sourceDeleted: false,
      nextPolicy: privatePolicy,
    })).toBe('delete');
    expect(decideSocialActivitySnapshotLifecycleAction({
      hadPublishedSnapshot: false,
      sourceDeleted: true,
      nextPolicy: privatePolicy,
    })).toBe('none');
  });

  it('valide les politiques persistables et rejette les champs inconnus ou mal placés', () => {
    expect(validateSocialActivityGlobalSharingPolicy(detailedPolicy)).toEqual({
      valid: true,
      issues: [],
    });

    const invalid = validateSocialActivitySharingOverride({
      mode: 'custom',
      fields: {
        common: ['activityType', 'notes'],
        cardio: ['distance'],
        strength: [],
      },
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.issues).toContainEqual({
      path: '$.fields.common[1]',
      message: 'Champ de partage inconnu.',
    });
  });

  it('refuse une sélection de champs sur un mode non personnalisé', () => {
    expect(validateSocialActivitySharingOverride({
      mode: 'summary',
      fields: EMPTY_SOCIAL_ACTIVITY_FIELD_SELECTION,
    })).toEqual({
      valid: false,
      issues: [{
        path: '$.fields',
        message: 'Une sélection spécifique est autorisée uniquement en mode personnalisé.',
      }],
    });
  });

  it('détecte récursivement les champs source interdits avant publication', () => {
    const candidate = {
      summary: { durationMinutes: 45 },
      detail: {
        exercises: [{ name: 'Développé couché', notes: 'Douleur épaule privée' }],
        calculation: { weightKg: 60 },
      },
    };

    expect(findForbiddenSocialActivitySourceFields(candidate)).toEqual([
      'calculation',
      'notes',
      'weightKg',
    ]);
    expect(() => assertNoForbiddenSocialActivitySourceFields(candidate)).toThrow(
      'Projection sociale invalide',
    );
  });

  it('accepte les métadonnées cardio déjà persistées dans le modèle métier', () => {
    const validation = validateSocialActivityGlobalSharingPolicy({
      visibility: 'custom',
      fields: {
        common: ['activityType', 'date', 'intensity'],
        cardio: ['sessionType', 'terrain', 'stroke', 'poolLength', 'bikeType', 'environment'],
        strength: [],
      },
    });

    expect(validation).toEqual({ valid: true, issues: [] });
  });

  it('sépare les champs cardio et musculation selon la famille réelle', () => {
    const selection = selectSocialActivityFieldsForFamily(detailedPolicy.fields, 'strength');

    expect(socialActivityFamilyForType('running')).toBe('cardio');
    expect(socialActivityFamilyForType('strengthTraining')).toBe('strength');
    expect(selection.cardio).toEqual([]);
    expect(selection.strength).toContain('loads');
  });
});
