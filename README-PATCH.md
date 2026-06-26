# SportPilot 0.15.0 — supersets, tri-sets et circuits

Branche recommandée : `feature/exercise-groups`

Cette phase ajoute l’organisation des exercices en groupes dans les séances modèles et les séances actives :

- supersets de 2 exercices ;
- tri-sets de 3 exercices ;
- circuits de 2 exercices ou plus ;
- nom facultatif du groupe ;
- nombre de tours ;
- repos entre exercices et entre tours ;
- duplication, dissolution et réorganisation ;
- repères `A1`, `A2`, `B1` pendant la séance ;
- indication de l’exercice suivant ;
- passage temporaire d’un exercice ;
- minuteur adapté à la transition ou au nouveau tour ;
- séries et statistiques toujours indépendantes par exercice ;
- sauvegarde JSON v2 et export CSV enrichis ;
- parcours Playwright Chromium et WebKit iPhone.

Architecture retenue :

- aucune nouvelle table Dexie ;
- les métadonnées du groupe sont portées par les exercices du modèle ;
- elles sont figées avec chaque exercice lors du démarrage de la séance ;
- les anciennes séances sans groupe restent inchangées ;
- aucun résultat statistique n’est fusionné entre les membres.

Compatibilité conservée :

- SportPilot `0.15.0` ;
- schéma Dexie v2 ;
- sauvegarde JSON v2 ;
- PWA et fonctionnement hors connexion ;
- aucune dépendance supplémentaire.

Contrôles :

```text
npm run ci
npm run test:stability
npm run test:e2e
```
