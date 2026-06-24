import type { NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';

export interface ProfileRepository {
  get(): Promise<UserProfile | undefined>;
  save(data: NewEntity<UserProfile>): Promise<UserProfile>;
  clear(): Promise<void>;
}
