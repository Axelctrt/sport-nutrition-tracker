# SportPilot 0.15.0 — minuteur de repos

Branche recommandée : `feature/rest-timer`

Ce patch ajoute :

- lancement automatique du repos après validation d’une série de travail ;
- démarrage manuel depuis chaque exercice configuré ;
- minuteur fondé sur un timestamp de fin, fiable après mise en arrière-plan ;
- pause, reprise, arrêt, `-15 s`, `+15 s` et `+30 s` ;
- zone fixe mobile avec marge de page adaptée pour ne pas masquer les séries ;
- vibration, son discret et fallback visuel accessibles ;
- préférences persistantes dans les paramètres avancés ;
- conservation temporaire dans `sessionStorage` pendant la séance ;
- arrêt automatique à la fin ou à l’abandon de la séance ;
- tests déterministes du domaine, du hook, de la page et du parcours E2E musculation.

Compatibilité conservée :

- schéma Dexie v2 ;
- sauvegarde JSON v2 ;
- anciennes bases et anciennes sauvegardes ;
- PWA et fonctionnement hors connexion ;
- aucune dépendance supplémentaire.

Contrôles :

```text
npm ci
npm run ci
npm run test:stability
npm run test:e2e
```
