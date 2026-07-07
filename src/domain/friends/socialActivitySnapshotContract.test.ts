import {
  SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
  createSocialActivitySnapshotV2Id,
  type CreateActiveSocialActivitySnapshotInput,
} from '@/domain/friends/socialActivitySnapshotContract';
import {
  createActiveSocialActivitySnapshotV2,
  createDeletedSocialActivitySnapshotV2,
} from '@/domain/friends/socialActivitySnapshotFactory';
import { validateSocialActivitySnapshotV2 } from '@/domain/friends/socialActivitySnapshotValidation';

const cardioInput: CreateActiveSocialActivitySnapshotInput = {
  ownerUserId: 'social-user:alex',
  recipientUserId: 'social-user:lina',
  sourceKind: 'activity',
  sourceActivityId: 'activity:run-1',
  sourceRevision: '2026-07-07T12:00:00.000Z',
  visibility: 'custom',
  family: 'cardio',
  activityType: 'running',
  title: 'Sortie tempo',
  occurredOn: '2026-07-07',
  occurredAt: '2026-07-07T07:15:00.000Z',
  allowedFields: {
    common: ['activityType', 'title', 'date', 'time', 'duration', 'intensity'],
    cardio: ['distance', 'sessionType', 'terrain', 'pace', 'paceSeries', 'chart'],
    strength: [],
  },
  summary: {
    durationMinutes: 48,
    intensity: 'high',
    distanceKm: 8.4,
    paceMinutesPerKm: 5.71,
  },
  detail: {
    family: 'cardio',
    sessionType: 'tempo',
    terrainType: 'trail',
    paceSeries: [
      { elapsedSeconds: 0, paceMinutesPerKm: 5.9 },
      { elapsedSeconds: 300, paceMinutesPerKm: 5.5 },
    ],
    chart: {
      metric: 'pace',
      points: [
        { elapsedSeconds: 0, value: 5.9 },
        { elapsedSeconds: 300, value: 5.5 },
      ],
    },
  },
  createdAt: '2026-07-07T12:00:00.000Z',
  updatedAt: '2026-07-07T12:00:00.000Z',
};

const strengthInput: CreateActiveSocialActivitySnapshotInput = {
  ownerUserId: 'social-user:alex',
  recipientUserId: 'social-user:lina',
  sourceKind: 'strengthSession',
  sourceActivityId: 'workout-session:push-1',
  sourceRevision: '2026-07-07T18:00:00.000Z',
  visibility: 'custom',
  family: 'strength',
  activityType: 'strengthTraining',
  title: 'Push',
  occurredOn: '2026-07-07',
  allowedFields: {
    common: ['activityType', 'title', 'date', 'duration'],
    cardio: [],
    strength: ['sessionName', 'muscleGroups', 'exerciseCount', 'exercises', 'sets', 'repetitions'],
  },
  summary: {
    durationMinutes: 62,
    exerciseCount: 2,
    muscleGroups: ['pectorals', 'shoulders', 'triceps'],
  },
  detail: {
    family: 'strength',
    sessionName: 'Push',
    exercises: [
      {
        name: 'Développé couché',
        muscleGroups: ['pectorals', 'triceps'],
        trackingMode: 'loadRepetitions',
        sets: [
          { setNumber: 1, repetitions: 10 },
          { setNumber: 2, repetitions: 8 },
        ],
      },
    ],
  },
  createdAt: '2026-07-07T18:00:00.000Z',
  updatedAt: '2026-07-07T18:00:00.000Z',
};

describe('social activity snapshot contract 0.29', () => {
  it('construit une projection cardio versionnée et strictement filtrée', () => {
    const snapshot = createActiveSocialActivitySnapshotV2(cardioInput);

    expect(snapshot).toMatchObject({
      contractVersion: SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
      state: 'active',
      family: 'cardio',
      sourceKind: 'activity',
      visibility: 'custom',
      summary: { distanceKm: 8.4 },
      detail: { family: 'cardio', sessionType: 'tempo' },
    });
    expect(validateSocialActivitySnapshotV2(snapshot)).toEqual({ valid: true, issues: [] });
  });

  it('garde une clé stable lorsque la visibilité et la révision changent', () => {
    const first = createActiveSocialActivitySnapshotV2(cardioInput);
    const second = createActiveSocialActivitySnapshotV2({
      ...cardioInput,
      sourceRevision: '2026-07-07T13:00:00.000Z',
      visibility: 'detailed',
    });

    expect(second.snapshotId).toBe(first.snapshotId);
    expect(second.sourceRevision).not.toBe(first.sourceRevision);
  });

  it('sépare deux destinataires sans dépendre du niveau de partage', () => {
    const linaId = createSocialActivitySnapshotV2Id(cardioInput);
    const zoeId = createSocialActivitySnapshotV2Id({
      ...cardioInput,
      recipientUserId: 'social-user:zoe',
    });

    expect(zoeId).not.toBe(linaId);
    expect(linaId).toContain('social-user%3Aalex');
  });

  it('représente une séance de musculation sans charge lorsque les charges sont masquées', () => {
    const snapshot = createActiveSocialActivitySnapshotV2(strengthInput);
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.detail).toMatchObject({ family: 'strength', sessionName: 'Push' });
    if (snapshot.detail?.family !== 'strength') throw new Error('détail musculation attendu');
    expect(snapshot.detail.exercises?.[0]).toMatchObject({ name: 'Développé couché' });
    expect(snapshot.detail.exercises?.[0]?.sets?.[0]).toMatchObject({ repetitions: 10 });
    expect(serialized).not.toContain('loadKg');
    expect(serialized).not.toContain('notes');
  });

  it('autorise les charges uniquement lorsque le champ loads est présent', () => {
    const validation = validateSocialActivitySnapshotV2({
      ...createActiveSocialActivitySnapshotV2(strengthInput),
      detail: {
        family: 'strength',
        exercises: [{ name: 'Développé couché', sets: [{ setNumber: 1, repetitions: 10, loadKg: 60 }] }],
      },
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContainEqual({
      path: '$.detail.exercises[0].sets[0].loadKg',
      message: "Le champ loads n'est pas autorisé.",
    });
  });

  it('exige le type et la date dans toute projection active', () => {
    const snapshot = createActiveSocialActivitySnapshotV2(cardioInput);
    const validation = validateSocialActivitySnapshotV2({
      ...snapshot,
      allowedFields: {
        ...snapshot.allowedFields,
        common: ['title', 'duration'],
      },
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(expect.arrayContaining([
      { path: '$.allowedFields.common', message: 'Le champ activityType est obligatoire.' },
      { path: '$.allowedFields.common', message: 'Le champ date est obligatoire.' },
    ]));
  });

  it('interdit un détail lorsque la visibilité effective est résumé', () => {
    const validation = validateSocialActivitySnapshotV2({
      ...createActiveSocialActivitySnapshotV2(cardioInput),
      visibility: 'summary',
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContainEqual({
      path: '$.detail',
      message: 'Un snapshot résumé ne doit pas contenir de détail.',
    });
  });

  it('rejette une famille de détail incompatible', () => {
    const validation = validateSocialActivitySnapshotV2({
      ...createActiveSocialActivitySnapshotV2(cardioInput),
      detail: { family: 'strength', sessionName: 'Intrusion' },
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContainEqual({
      path: '$.detail.family',
      message: 'La famille du détail ne correspond pas au snapshot.',
    });
  });

  it('rejette les champs arbitraires même dans une structure autrement valide', () => {
    const validation = validateSocialActivitySnapshotV2({
      ...createActiveSocialActivitySnapshotV2(cardioInput),
      rawPayload: { secret: true },
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContainEqual({
      path: '$.rawPayload',
      message: 'Champ non prévu par le contrat.',
    });
  });

  it('détecte récursivement une note privée introduite dans un exercice', () => {
    const snapshot = createActiveSocialActivitySnapshotV2(strengthInput);
    const validation = validateSocialActivitySnapshotV2({
      ...snapshot,
      detail: {
        family: 'strength',
        exercises: [{ name: 'Développé couché', notes: 'Douleur épaule privée' }],
      },
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.message.includes('notes'))).toBe(true);
  });

  it('refuse une source activité générique pour une séance de musculation', () => {
    const validation = validateSocialActivitySnapshotV2({
      ...createActiveSocialActivitySnapshotV2(strengthInput),
      sourceKind: 'activity',
      snapshotId: createSocialActivitySnapshotV2Id({
        ...strengthInput,
        sourceKind: 'activity',
      }),
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues).toContainEqual({
      path: '$.sourceKind',
      message: "Une projection de musculation doit provenir d'une strengthSession.",
    });
  });

  it('produit un tombstone minimal avec la même clé déterministe', () => {
    const active = createActiveSocialActivitySnapshotV2(cardioInput);
    const deleted = createDeletedSocialActivitySnapshotV2({
      ownerUserId: cardioInput.ownerUserId,
      recipientUserId: cardioInput.recipientUserId,
      sourceKind: cardioInput.sourceKind,
      sourceActivityId: cardioInput.sourceActivityId,
      sourceRevision: 'deleted:2026-07-07T14:00:00.000Z',
      deletionReason: 'sharingDisabled',
      createdAt: active.createdAt,
      deletedAt: '2026-07-07T14:00:00.000Z',
    });

    expect(deleted.snapshotId).toBe(active.snapshotId);
    expect(deleted).toEqual({
      contractVersion: SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
      snapshotId: active.snapshotId,
      ownerUserId: cardioInput.ownerUserId,
      recipientUserId: cardioInput.recipientUserId,
      sourceKind: 'activity',
      sourceActivityId: cardioInput.sourceActivityId,
      sourceRevision: 'deleted:2026-07-07T14:00:00.000Z',
      createdAt: active.createdAt,
      updatedAt: '2026-07-07T14:00:00.000Z',
      state: 'deleted',
      deletedAt: '2026-07-07T14:00:00.000Z',
      deletionReason: 'sharingDisabled',
    });
  });

  it('rejette une clé modifiée et une version de contrat inconnue', () => {
    const snapshot = createActiveSocialActivitySnapshotV2(cardioInput);
    const validation = validateSocialActivitySnapshotV2({
      ...snapshot,
      contractVersion: '0.29.0-unknown',
      snapshotId: `${snapshot.snapshotId}:summary`,
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['$.contractVersion', '$.snapshotId']),
    );
  });
});
