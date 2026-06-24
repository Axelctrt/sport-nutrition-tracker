import type { WeightGoal } from '@/domain/models/profile';

export const SUGGESTED_WEEKLY_CHANGE_PERCENT: Record<WeightGoal, number> = {
  loss: -0.5,
  maintenance: 0,
  gain: 0.25,
};
