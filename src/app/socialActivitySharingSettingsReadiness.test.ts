import privacyPageSource from '@/features/friends/pages/FriendsPrivacyPage.tsx?raw';
import activityFormSource from '@/features/activities/components/ActivityForm.tsx?raw';
import workoutPageSource from '@/features/strength-sessions/pages/WorkoutSessionPage.tsx?raw';
import sharingSettingsSource from '@/features/friends/components/SocialActivitySharingSettings.tsx?raw';
import publicationSource from '@/application/friends/socialActivityPublicationService.ts?raw';
import reconciliationSource from '@/infrastructure/social-activity-snapshots/runtimeSocialActivityPrivacyReconciliation.ts?raw';

describe('social activity sharing settings readiness 0.29.0 A9', () => {
  it('branche les quatre niveaux globaux sur la page de confidentialité', () => {
    expect(privacyPageSource).toContain('SocialActivityGlobalSharingSettings');
    expect(privacyPageSource).toContain('setSocialActivitySharingPolicy');
    expect(privacyPageSource).toContain('reconcilePrivacy');
    expect(privacyPageSource).toContain('reconcilePrivacy(persistSnapshot');
    expect(sharingSettingsSource).toContain("'private',");
    expect(sharingSettingsSource).toContain("'summary',");
    expect(sharingSettingsSource).toContain("'detailed',");
    expect(sharingSettingsSource).toContain("'custom',");
  });

  it('propose une surcharge sur les activités et les séances de musculation', () => {
    expect(activityFormSource).toContain('SocialActivityOverrideSettings');
    expect(activityFormSource).toContain('Partage avec les amis');
    expect(workoutPageSource).toContain('SocialActivityOverrideSettings');
    expect(workoutPageSource).toContain('saveSocialSharing');
    expect(workoutPageSource).toContain('Enregistrer le partage');
  });

  it('reste mobile-first et exclut les notes du contrat partageable', () => {
    expect(sharingSettingsSource).toContain('min-h-11');
    expect(sharingSettingsSource).toContain('sm:grid-cols-2');
    expect(sharingSettingsSource).toContain('restent toujours privés');
    expect(sharingSettingsSource).toContain('disabled={disabled}');
    expect(sharingSettingsSource).not.toContain("notes: '");
  });

  it('réconcilie les données existantes sans bloquer les fonctions sportives', () => {
    expect(publicationSource).toContain('activity.socialSharing');
    expect(publicationSource).toContain('session.socialSharing');
    expect(reconciliationSource).toContain('reconcileAllSocialActivityPrivacy');
    expect(reconciliationSource).toContain('continue;');
  });
});
