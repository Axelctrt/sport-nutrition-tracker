import { getRouteTitle } from '@/app/routeMetadata';

describe('getRouteTitle', () => {
  it('retourne un titre mobile précis pour les routes principales et imbriquées', () => {
    expect(getRouteTitle('/')).toBe('Accueil');
    expect(getRouteTitle('/food')).toBe('Nutrition');
    expect(getRouteTitle('/activities')).toBe('Sport');
    expect(getRouteTitle('/progression')).toBe('Progression');
    expect(getRouteTitle('/analytics')).toBe('Analyses');
    expect(getRouteTitle('/history')).toBe('Historique général');
    expect(getRouteTitle('/strength/planning')).toBe('Planning sportif');
    expect(getRouteTitle('/activities/templates')).toBe('Modèles d’endurance');
    expect(getRouteTitle('/settings/dashboard')).toBe('Affichage de l’Accueil');
    expect(getRouteTitle('/settings/sync-prototype')).toBe('Compte de synchronisation');
    expect(getRouteTitle('/settings/account-devices')).toBe('Compte et appareils');
    expect(getRouteTitle('/settings/account-sync')).toBe('Compte et synchronisation');
    expect(getRouteTitle('/settings/appearance-accessibility')).toBe('Apparence et accessibilité');
    expect(getRouteTitle('/settings/advanced')).toBe('Paramètres avancés');
    expect(getRouteTitle('/strength/sessions/session-1')).toBe('Séance de musculation');
    expect(getRouteTitle('/strength/exercises/exercise-1/history')).toBe('Historique de l’exercice');
    expect(getRouteTitle('/rewards')).toBe('Centre de récompenses');
    expect(getRouteTitle('/friends')).toBe('Amis et confidentialité');
    expect(getRouteTitle('/backup/trash')).toBe('Corbeille');
    expect(getRouteTitle('/privacy')).toBe('Confidentialité');
  });

  it('utilise le nom de l’application comme repli', () => {
    expect(getRouteTitle('/route-inconnue')).toBe('SportPilot');
  });
});
