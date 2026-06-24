import { LOCAL_USER_PROFILE_ID } from '@/domain/defaults/identifiers';
import type { NewEntity } from '@/domain/models/common';
import type { UserProfile } from '@/domain/models/profile';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { ProfileRepository } from '@/infrastructure/repositories/contracts/ProfileRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import { createEntity, updateEntity } from '@/shared/utils/entities';

export class DexieProfileRepository implements ProfileRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  get(): Promise<UserProfile | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de lire le profil local.',
      () => this.database.userProfile.get(LOCAL_USER_PROFILE_ID),
    );
  }

  save(data: NewEntity<UserProfile>): Promise<UserProfile> {
    return runRepositoryOperation(
      'update',
      'Impossible d’enregistrer le profil local.',
      async () => {
        const current = await this.database.userProfile.get(LOCAL_USER_PROFILE_ID);
        const profile = current
          ? updateEntity(current, data)
          : createEntity<UserProfile>(data, LOCAL_USER_PROFILE_ID);

        await this.database.userProfile.put(profile);
        return profile;
      },
    );
  }

  clear(): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer le profil local.',
      () => this.database.userProfile.delete(LOCAL_USER_PROFILE_ID),
    );
  }
}
