import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { settingsFormSchema } from '@/features/settings/schemas/settingsSchema';
import { settingsToFormValues } from '@/features/settings/utils/settingsForm';

function createDefaultValues() {
  return settingsToFormValues(createDefaultAppSettings());
}

describe('settingsFormSchema', () => {
  it('accepte les paramètres par défaut du cahier des charges', () => {
    expect(settingsFormSchema.safeParse(createDefaultValues()).success).toBe(true);
  });

  it('refuse une limite cumulée inférieure à la limite hebdomadaire', () => {
    const values = createDefaultValues();
    values.maximumWeeklyAdjustmentKcal = 200;
    values.maximumCumulativeAdjustmentKcal = 100;

    expect(settingsFormSchema.safeParse(values).success).toBe(false);
  });

  it('refuse une valeur MET hors plage', () => {
    const values = createDefaultValues();
    values.swimmingMetValues.competition = 25;

    expect(settingsFormSchema.safeParse(values).success).toBe(false);
  });
});
