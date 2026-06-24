import { createContext } from 'react';
import type { NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';

export type ProfileStatus = 'loading' | 'ready' | 'error';

export interface ProfileContextValue {
  status: ProfileStatus;
  profile: UserProfile | undefined;
  errorMessage: string | undefined;
  saveProfile: (profile: NewEntity<UserProfile>) => Promise<UserProfile>;
  clearProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);
