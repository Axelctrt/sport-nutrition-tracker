# SportPilot 0.16.0 — promotion stable

Branche recommandée : `release/0.16.0`

Cette phase ne rajoute aucune fonctionnalité métier. Elle promeut la Release Candidate validée vers la version stable :

- version applicative portée à `0.16.0` ;
- audit de production exécuté automatiquement en mode stable ;
- notes de publication, checklist, installation et retour arrière alignés ;
- procédure de fusion dans `main`, création du tag `v0.16.0` et réalignement de `develop` ;
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
- build PWA et audits de production stable validés.
