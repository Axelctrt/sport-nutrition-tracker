import {
  resolveCoachPhase,
  type CoachPhase,
} from '@/domain/coach/coachPhase';
import type { UserProfile } from '@/domain/models/profile';

export function resolveCurrentCoachPhase(
  profile: Pick<UserProfile, 'goal'> | undefined,
): CoachPhase | undefined {
  return resolveCoachPhase(profile?.goal);
}
