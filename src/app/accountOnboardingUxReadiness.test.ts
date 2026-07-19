import dataSpaceGateSource from '@/app/data-spaces/DataSpaceAccountGate.tsx?raw';
import socialIdentityGateSource from '@/app/social-identity/SocialIdentityAccountGate.tsx?raw';
import accountChoiceSource from '@/features/onboarding/components/OnboardingAccountChoice.tsx?raw';
import socialIdentitySource from '@/features/onboarding/components/OnboardingSocialIdentity.tsx?raw';
import syncPrototypeSource from '@/features/sync-prototype/pages/SyncPrototypePage.tsx?raw';

describe('onboarding compte compact et cohérent', () => {
  it('garde la décision de reprise dans une page mobile sans scroll', () => {
    expect(dataSpaceGateSource).toContain('fixed inset-0 h-[100dvh] overflow-hidden');
    expect(dataSpaceGateSource).toContain('Comment souhaitez-vous commencer ?');
    expect(dataSpaceGateSource).toContain('Reprendre mes données');
    expect(dataSpaceGateSource).toContain('Créer un nouveau profil');
    expect(dataSpaceGateSource).not.toContain('Choisir l’espace de ce compte');
  });

  it('garde l’identité sociale compacte avec les exemples validés', () => {
    expect(socialIdentitySource).toContain('fixed inset-0 h-[100dvh] overflow-hidden');
    expect(socialIdentitySource).toContain('axel_aka_dieu');
    expect(socialIdentitySource).toContain('Axel le Dieu');
    expect(socialIdentitySource).not.toContain('La réservation est effectuée côté serveur');
    expect(socialIdentitySource).not.toContain('Vérifier');
    expect(socialIdentitySource).not.toContain('checkAccountSocialHandleAvailability');
  });

  it('reprend le formulaire de profil directement à l’étape du nom', () => {
    expect(socialIdentityGateSource).toContain('PROFILE_ONBOARDING_STEP_IDS.name');
    expect(socialIdentityGateSource).toContain('resumeProfileOnboarding()');
    expect(socialIdentityGateSource).toContain("#${routePaths.onboarding}");
  });

  it('utilise un clavier alphanumérique pour tous les codes Dexie Cloud', () => {
    for (const source of [accountChoiceSource, syncPrototypeSource]) {
      expect(source).toContain('autoComplete="one-time-code"');
      expect(source).toContain('inputMode="text"');
      expect(source).toContain('autoCapitalize="none"');
      expect(source).toContain('autoCorrect="off"');
      expect(source).not.toContain('inputMode="numeric"');
    }
  });
});
