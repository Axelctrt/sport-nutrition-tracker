import { PROFILE_ONBOARDING_STEP_IDS } from '@/features/onboarding/profile/profileOnboardingSteps';
import { saveProfileOnboardingDraft } from '@/features/onboarding/storage/profileOnboardingDraft';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';
import {
  activateExistingAccountDataSpace,
  createEmptyAccountDataSpace,
  findAccountDataSpace,
} from '@/infrastructure/data-spaces/accountDataSpaceService';
import { activeDataSpace } from '@/infrastructure/database/database';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSyncPrototypeAccountFingerprint } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

export type ConnectedOnboardingAccountPreparation =
  | { status: 'ready'; reloading: boolean }
  | {
      status: 'choice-required';
      reason: 'cloud-data' | 'unknown-cloud-state';
      reloading: false;
    };

function fingerprintFromClient(client: SyncPrototypeClient): string {
  const snapshot = client.getSnapshot();
  const fingerprint = createSyncPrototypeAccountFingerprint(
    snapshot.account.userId ?? snapshot.account.email,
  )?.toLowerCase();

  if (!fingerprint) {
    throw new Error('Le compte connecté ne fournit pas d’identifiant exploitable.');
  }

  return fingerprint;
}

export async function prepareConnectedOnboardingAccount(
  client: SyncPrototypeClient,
): Promise<ConnectedOnboardingAccountPreparation> {
  const fingerprint = fingerprintFromClient(client);

  if (
    activeDataSpace.kind === 'account'
    && activeDataSpace.accountFingerprint === fingerprint
  ) {
    return { status: 'ready', reloading: false };
  }

  const existing = findAccountDataSpace(fingerprint);
  if (existing) {
    activateExistingAccountDataSpace(fingerprint);
    window.location.reload();
    return { status: 'ready', reloading: true };
  }

  if (!client.prepareCloudRestore) {
    return {
      status: 'choice-required',
      reason: 'unknown-cloud-state',
      reloading: false,
    };
  }

  const preparedCloud = await client.prepareCloudRestore(fingerprint);
  if (preparedCloud.preview.hasCloudData) {
    return {
      status: 'choice-required',
      reason: 'cloud-data',
      reloading: false,
    };
  }

  const result = await createEmptyAccountDataSpace(fingerprint);
  const draftSaved = saveProfileOnboardingDraft(
    DEFAULT_PROFILE_FORM_VALUES,
    PROFILE_ONBOARDING_STEP_IDS.name,
    result.space.id,
  );

  if (!draftSaved) {
    throw new Error('La reprise du formulaire de profil n’a pas pu être préparée.');
  }

  window.location.reload();
  return { status: 'ready', reloading: true };
}
