import { getRouteTitle } from '@/app/routeMetadata';

describe('getRouteTitle', () => {
  it('retourne un titre mobile précis pour les routes principales et imbriquées', () => {
    expect(getRouteTitle('/')).toBe('Aujourd’hui');
    expect(getRouteTitle('/food')).toBe('Alimentation');
    expect(getRouteTitle('/strength/planning')).toBe('Planning de musculation');
    expect(getRouteTitle('/activities/templates')).toBe('Modèles d’endurance');
    expect(getRouteTitle('/settings/dashboard')).toBe('Personnaliser le tableau de bord');
    expect(getRouteTitle('/settings/sync-prototype')).toBe('Compte de synchronisation');
    expect(getRouteTitle('/strength/sessions/session-1')).toBe('Séance de musculation');
    expect(getRouteTitle('/strength/exercises/exercise-1/history')).toBe('Historique de l’exercice');
    expect(getRouteTitle('/rewards')).toBe('Centre de récompenses');
    expect(getRouteTitle('/backup/trash')).toBe('Corbeille');
    expect(getRouteTitle('/privacy')).toBe('Confidentialité');
  });

  it('utilise le nom de l’application comme repli', () => {
    expect(getRouteTitle('/route-inconnue')).toBe('SportPilot');
  });
});
