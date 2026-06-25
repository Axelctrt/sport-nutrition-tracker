import { describe, expect, it } from 'vitest';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { activityToFormValues, defaultActivityFormValues, toActivityDraft } from '@/features/activities/utils/activityForm';
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
