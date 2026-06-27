# SportPilot 0.16.0-rc.1 — stabilisation avant publication

Branche recommandée : `release/0.16.0-rc.1`

Cette phase ne rajoute aucune fonctionnalité métier. Elle prépare une Release Candidate reproductible et vérifiable :

- version applicative portée à `0.16.0-rc.1` ;
- audit de production automatique selon le type de version ;
- audit du dépôt contre les dossiers de patch, rapports de tests et secrets suivis par Git ;
- documentation de publication, limitations connues et retour arrière alignés ;
- vérification de cohérence entre package, README, installation et notes de publication ;
- conservation du schéma Dexie v2 et de la sauvegarde JSON v2 ;
- aucune migration et aucune dépendance supplémentaire.

Contrôles déterministes :

```text
npm run release:verify
```

Contrôles navigateurs :

```text
npm run test:e2e
```
Validation de référence :

- 163 fichiers Vitest ;
- 495 tests Vitest ;
- suite brassée avec le seed `20260626` ;
- 26 exécutions Playwright découvertes dans 11 fichiers ;
- build PWA et audits de production validés.
