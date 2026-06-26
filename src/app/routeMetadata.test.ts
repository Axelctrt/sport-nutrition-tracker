import { getRouteTitle } from '@/app/routeMetadata';

describe('getRouteTitle', () => {
  it('retourne un titre mobile précis pour les routes principales et imbriquées', () => {
    expect(getRouteTitle('/')).toBe('Aujourd’hui');
    expect(getRouteTitle('/food')).toBe('Alimentation');
    expect(getRouteTitle('/strength/sessions/session-1')).toBe('Séance de musculation');
    expect(getRouteTitle('/strength/exercises/exercise-1/history')).toBe('Historique de l’exercice');
  });

  it('utilise le nom de l’application comme repli', () => {
    expect(getRouteTitle('/route-inconnue')).toBe('SportPilot');
  });
});
