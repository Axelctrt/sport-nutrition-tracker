import type { StrengthSetType } from '@/domain/models/strength';

export const strengthSetTypeLabels: Record<StrengthSetType, string> = {
  warmup: 'Échauffement',
  working: 'Travail',
  dropSet: 'Dégressive',
  failure: 'Échec',
  other: 'Autre',
};
