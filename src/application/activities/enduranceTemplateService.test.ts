import { describe, expect, it, vi } from 'vitest';
import {
  deleteEnduranceTemplate,
  duplicateEnduranceTemplate,
  listEnduranceTemplates,
  saveEnduranceTemplate,
  type EnduranceTemplateDependencies,
} from '@/application/activities/enduranceTemplateService';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { AppSettings } from '@/domain/models/settings';

function dependencies(): EnduranceTemplateDependencies {
  let settings: AppSettings = createDefaultAppSettings();
  return {
    createId: vi.fn(() => 'template-new'),
    settings: {
      get: vi.fn(async () => settings),
      update: vi.fn(async (changes) => {
        settings = { ...settings, ...changes };
        return settings;
      }),
    },
  };
}

describe('modèles d’endurance', () => {
  it('crée, duplique et supprime un modèle local', async () => {
    const deps = dependencies();
    const created = await saveEnduranceTemplate({
      name: 'Sortie trail',
      activityType: 'running',
      durationMinutes: 90,
      intensity: 'moderate',
      runningSessionType: 'longRun',
      distanceKm: 15,
      averageCadenceSpm: 165,
      terrainType: 'trail',
    }, undefined, deps);

    expect(created.id).toBe('template-new');
    expect(await listEnduranceTemplates(deps)).toContainEqual(created);

    const copy = await duplicateEnduranceTemplate(created.id, {
      ...deps,
      createId: () => 'template-copy',
    });
    expect(copy.name).toContain('copie');

    await deleteEnduranceTemplate(created.id, deps);
    expect((await listEnduranceTemplates(deps)).some((template) => template.id === created.id)).toBe(false);
  });

  it('refuse deux noms identiques', async () => {
    const deps = dependencies();
    await expect(saveEnduranceTemplate({
      name: 'Course facile 45 min',
      activityType: 'running',
      durationMinutes: 30,
      intensity: 'low',
    }, undefined, deps)).rejects.toThrow('déjà ce nom');
  });
});
