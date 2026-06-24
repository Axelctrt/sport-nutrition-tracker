import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useDatabase } from '@/app/providers/database/useDatabase';
import {
  ProfileContext,
  type ProfileStatus,
} from '@/app/providers/profile/ProfileContext';
import type { NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import { repositories } from '@/infrastructure/repositories/repositories';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Une erreur inconnue empêche l’accès au profil local.';
}

export function ProfileProvider({ children }: PropsWithChildren) {
  const database = useDatabase();
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const refreshProfile = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);

    try {
      const storedProfile = await repositories.profile.get();
      setProfile(storedProfile);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (database.status === 'initializing') {
      setStatus('loading');
      return;
    }

    if (database.status === 'error') {
      setStatus('error');
      setErrorMessage(database.errorMessage ?? 'La base locale est indisponible.');
      return;
    }

    void refreshProfile();
  }, [database.errorMessage, database.status, refreshProfile]);

  const saveProfile = useCallback(async (data: NewEntity<UserProfile>) => {
    try {
      const savedProfile = await repositories.profile.save(data);
      setProfile(savedProfile);
      setStatus('ready');
      setErrorMessage(undefined);
      return savedProfile;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  }, []);

  const clearProfile = useCallback(async () => {
    try {
      await repositories.profile.clear();
      setProfile(undefined);
      setStatus('ready');
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      profile,
      errorMessage,
      saveProfile,
      clearProfile,
      refreshProfile,
    }),
    [clearProfile, errorMessage, profile, refreshProfile, saveProfile, status],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
