# SportPilot 0.15.0 — statistiques adaptées au type d’exercice

Branche recommandée : `feature/bodyweight-statistics`

Ce patch ajoute une méthode de suivi explicite par exercice :

- charge externe et répétitions ;
- poids du corps, avec lest facultatif ;
- exercice assisté ;
- répétitions seules ;
- durée ;
- distance.

Les statistiques, formulaires de séries, séances modèles et historiques s’adaptent désormais à cette méthode. Une traction au poids du corps n’affiche plus un volume nul, une assistance plus faible est considérée comme une progression, et les charges effectives utilisent le dernier poids connu à la date de la séance.

Compatibilité conservée :

- schéma Dexie v2 ;
- sauvegarde JSON v2 ;
- anciens exercices sans méthode explicite ;
- anciennes séances et anciennes sauvegardes ;
- PWA et fonctionnement hors connexion ;
- aucune dépendance supplémentaire.

Contrôles :

```text
npm ci
npm run ci
npm run test:stability
npm run test:e2e
```
