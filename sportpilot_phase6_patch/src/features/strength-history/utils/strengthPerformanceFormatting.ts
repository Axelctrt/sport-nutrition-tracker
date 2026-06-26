import type { StrengthSet, StrengthTrackingMode } from '@/domain/models/strength';
import { calculateEffectiveLoadKg } from '@/domain/strength/strengthTracking';

export function formatStrengthNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

export function formatStrengthDuration(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  if (minutes === 0) return `${seconds} s`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds.toString().padStart(2, '0')} s`;
}

export function trackingModeTitle(mode: StrengthTrackingMode): string {
  switch (mode) {
    case 'loadRepetitions':
      return 'Charge externe';
    case 'bodyweightRepetitions':
      return 'Poids du corps';
    case 'assistedRepetitions':
      return 'Poids du corps assisté';
    case 'repetitions':
      return 'Répétitions seules';
    case 'duration':
      return 'Durée';
    case 'distance':
      return 'Distance';
  }
}

export function setPerformanceSummary(
  set: StrengthSet,
  mode: StrengthTrackingMode,
  bodyWeightKg?: number,
): string {
  const rpe = set.rpe === undefined ? '' : ` · RPE ${formatStrengthNumber(set.rpe)}`;
  switch (mode) {
    case 'loadRepetitions':
      return `${formatStrengthNumber(set.weightKg)} kg × ${set.repetitions}${rpe}`;
    case 'bodyweightRepetitions': {
      const base = set.weightKg > 0
        ? `Poids du corps + ${formatStrengthNumber(set.weightKg)} kg × ${set.repetitions}`
        : `Poids du corps × ${set.repetitions}`;
      const effective = calculateEffectiveLoadKg(mode, set.weightKg, bodyWeightKg);
      return `${base}${effective === undefined ? '' : ` · charge totale ${formatStrengthNumber(effective)} kg`}${rpe}`;
    }
    case 'assistedRepetitions': {
      const effective = calculateEffectiveLoadKg(mode, set.weightKg, bodyWeightKg);
      return `Assistance ${formatStrengthNumber(set.weightKg)} kg × ${set.repetitions}${effective === undefined ? '' : ` · charge effective ${formatStrengthNumber(effective)} kg`}${rpe}`;
    }
    case 'repetitions':
      return `${set.repetitions} répétition${set.repetitions > 1 ? 's' : ''}${rpe}`;
    case 'duration':
      return `${formatStrengthDuration(set.durationSeconds ?? 0)}${rpe}`;
    case 'distance':
      return `${formatStrengthNumber(set.distanceMeters ?? 0)} m${rpe}`;
  }
}
