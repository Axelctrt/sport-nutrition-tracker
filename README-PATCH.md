# SportPilot 0.15.0-alpha.2 — séance de musculation mobile

Branche obligatoire : `feature/mobile-workout-ux`

Cette étape optimise la page de séance sans modifier les données ni les règles métier :

- barre d’action mobile avec durée, sauvegarde, abandon et fin de séance ;
- rafraîchissements silencieux conservant le contenu et la position ;
- cartes d’exercices repliables et avancement visible ;
- performance précédente compacte ;
- saisie mobile des séries sur trois colonnes ;
- type et notes dans une section secondaire ;
- toasts après les actions rapides ;
- dialogues accessibles à la place de `window.confirm` ;
- ajout et duplication révélant seulement le nouvel élément ;
- aucune migration Dexie et aucune modification du format de sauvegarde.

## Validation

```powershell
npm install
npm run check
```

Tester prioritairement sur iPhone en portrait avec une séance réelle.
