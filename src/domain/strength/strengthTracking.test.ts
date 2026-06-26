import {
  calculateAdditionalVolumeKg,
  calculateEffectiveLoadKg,
  calculateSetVolumeKg,
  defaultTrackingModeForLoadUnit,
  loadUnitForTrackingMode,
  primarySetValue,
} from '@/domain/strength/strengthTracking';

describe('strengthTracking', () => {
  it('conserve une stratégie cohérente pour les anciens exercices', () => {
    expect(defaultTrackingModeForLoadUnit('kg')).toBe('loadRepetitions');
    expect(defaultTrackingModeForLoadUnit('bodyweight')).toBe('bodyweightRepetitions');
    expect(defaultTrackingModeForLoadUnit('assistedKg')).toBe('assistedRepetitions');
    expect(defaultTrackingModeForLoadUnit('none')).toBe('repetitions');
  });

  it('associe chaque stratégie à une unité compatible', () => {
    expect(loadUnitForTrackingMode('loadRepetitions')).toBe('kg');
    expect(loadUnitForTrackingMode('bodyweightRepetitions')).toBe('bodyweight');
    expect(loadUnitForTrackingMode('assistedRepetitions')).toBe('assistedKg');
    expect(loadUnitForTrackingMode('duration')).toBe('none');
    expect(loadUnitForTrackingMode('distance')).toBe('none');
  });

  it('calcule la charge effective pour le poids du corps et l’assistance', () => {
    expect(calculateEffectiveLoadKg('loadRepetitions', 60, 70)).toBe(60);
    expect(calculateEffectiveLoadKg('bodyweightRepetitions', 10, 70)).toBe(80);
    expect(calculateEffectiveLoadKg('assistedRepetitions', 20, 70)).toBe(50);
    expect(calculateEffectiveLoadKg('assistedRepetitions', 90, 70)).toBe(0);
    expect(calculateEffectiveLoadKg('bodyweightRepetitions', 10)).toBeUndefined();
  });

  it('sépare le volume additionnel du volume effectif', () => {
    const set = { weightKg: 10, repetitions: 8 };
    expect(calculateAdditionalVolumeKg(set, 'bodyweightRepetitions')).toBe(80);
    expect(calculateSetVolumeKg(set, 'bodyweightRepetitions', 70)).toBe(640);
  });

  it('prépare les mesures de durée et de distance', () => {
    const set = { repetitions: 0, durationSeconds: 90, distanceMeters: 40 };
    expect(primarySetValue(set, 'duration')).toBe(90);
    expect(primarySetValue(set, 'distance')).toBe(40);
    expect(primarySetValue(set, 'repetitions')).toBe(0);
  });
});
