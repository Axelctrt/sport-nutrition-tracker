import privacyPageSource from '@/features/friends/pages/FriendsPrivacyPage.tsx?raw';
import activityFormSource from '@/features/activities/components/ActivityForm.tsx?raw';
import workoutPageSource from '@/features/strength-sessions/pages/WorkoutSessionPage.tsx?raw';
import sharingSettingsSource from '@/features/friends/components/SocialActivitySharingSettings.tsx?raw';
import publicationSource from '@/application/friends/socialActivityPublicationService.ts?raw';
import friendshipSource from '@/domain/friends/friendship.ts?raw';


describe('social activity sharing settings readiness 0.29.0 A20 R3', () => {
  it('utilise la permission par ami comme unique réglage visible', () => {
    expect(privacyPageSource).toContain('SocialActivityFriendSharingSettings');
    expect(privacyPageSource).not.toContain('SocialActivityGlobalSharingSettings');
    expect(sharingSettingsSource).toContain("{ value: 'none', label: 'Aucun' }");
    expect(sharingSettingsSource).toContain("{ value: 'summary', label: 'Résumé' }");
    expect(sharingSettingsSource).toContain("{ value: 'detailed', label: 'Personnalisé' }");
    expect(sharingSettingsSource).toContain('Partage : {modeLabel}');
  });

  it('retire les réglages sociaux des formulaires sportifs', () => {
    expect(activityFormSource).not.toContain('SocialActivityOverrideSettings');
    expect(activityFormSource).not.toContain('Partage avec les amis');
    expect(workoutPageSource).not.toContain('SocialActivityOverrideSettings');
    expect(workoutPageSource).not.toContain('Enregistrer le partage');
  });

  it('reste compact et n’annonce que les données réellement disponibles', () => {
    expect(sharingSettingsSource).toContain('min-h-11');
    expect(sharingSettingsSource).toContain('Musculation');
    expect(sharingSettingsSource).toContain('Cardio');
    expect(sharingSettingsSource).toContain('Visible uniquement lorsqu’il est renseigné.');
    expect(sharingSettingsSource).toContain('Visibles uniquement lorsqu’elles sont calculées.');
    expect(sharingSettingsSource).not.toContain("label: 'Graphique'");
  });

  it('conserve uniquement la surcharge privée historique et filtre côté serveur', () => {
    expect(publicationSource).toContain("override?.mode === 'private'");
    expect(publicationSource).toContain('evaluateFriendScopedActivitySharingGuard');
    expect(friendshipSource).toContain("FriendActivityPermissionLevel = 'none' | 'summary' | 'detailed'");
  });
});
