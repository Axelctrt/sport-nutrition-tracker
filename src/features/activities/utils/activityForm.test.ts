import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { activityToDraft, activityToFormValues, defaultActivityFormValues, toActivityDraft } from '@/features/activities/utils/activityForm';
import { createEntity } from '@/shared/utils/entities';
import { createRunningActivityInput } from '@/test/factories/activityFactory';

describe('activityForm utils', () => {
  it('propose les MET configurés selon le type', () => {
    const settings = createDefaultAppSettings();

    expect(defaultActivityFormValues('strengthTraining', settings).met).toBe(5);
    expect(defaultActivityFormValues('cycling', settings).met).toBe(6.8);
    expect(defaultActivityFormValues('walking', settings).includedInDailySteps).toBe(true);
  });

  it('nettoie les champs facultatifs avant de créer un brouillon', () => {
    const values = defaultActivityFormValues('running', createDefaultAppSettings());
    const draft = toActivityDraft({ ...values, notes: '   ', time: '' });

    expect('notes' in draft).toBe(false);
    expect('time' in draft).toBe(false);
    expect('rpe' in draft).toBe(false);
  });

  it('reconstruit un brouillon duplicable sans reprendre les métadonnées techniques', () => {
    const activity = createEntity(createRunningActivityInput({
      notes: 'Séance fluide',
      manualCaloriesKcal: 420,
    }), 'activity-original');

    expect(activityToDraft(activity)).toEqual({
      type: 'running',
      date: '2026-06-23',
      time: '18:00',
      durationMinutes: 50,
      intensity: 'moderate',
      notes: 'Séance fluide',
      manualCaloriesKcal: 420,
      sessionType: 'easy',
      distanceKm: 8,
      averageCadenceSpm: 170,
      terrainType: 'road',
    });
  });

  it('reconstruit les valeurs du formulaire depuis une activité', () => {
    const activity = createEntity(createRunningActivityInput({
      sessionType: 'tempo',
      distanceKm: 10,
      averageCadenceSpm: 176,
    }));

    const values = activityToFormValues(activity);
    expect(values).not.toHaveProperty('rpe');
    expect(values).toMatchObject({
      activityType: 'running',
      runningSessionType: 'tempo',
      distanceKm: 10,
      averageCadenceSpm: 176,
    });
  });
});
