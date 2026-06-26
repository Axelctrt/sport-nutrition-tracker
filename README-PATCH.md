# SportPilot 0.15.0-rc.1 — stabilisation finale et Release Candidate

Branche obligatoire : `release/0.15.0-rc.1`

Cette Release Candidate gèle les fonctionnalités de la version 0.15 et ajoute les derniers garde-fous avant publication stable.

## Stabilisations intégrées

- toutes les routes réellement enregistrées sont regroupées dans une liste testable ;
- les destinations des navigations ordinateur, mobile et du menu secondaire sont vérifiées contre le routeur ;
- chaque route du shell doit posséder un titre explicite ;
- les chemins dynamiques de recettes, activités, exercices et séances utilisent les constantes centrales et encodent leurs identifiants ;
- la sauvegarde JSON est automatiquement comparée à la liste complète des tables Dexie ;
- l’application reste utilisable si `localStorage` refuse la lecture ou l’écriture du thème ;
- l’écran global d’erreur permet de revenir à l’accueil sans effacer les données locales ;
- la version installée est visible dans le résumé des paramètres ;
- un audit Release Candidate contrôle les budgets JavaScript/CSS, les fichiers de production, les raccourcis PWA et l’absence de source maps ;
- `npm run check` exécute désormais lint, tests, build, audit MVP, audit de version et audit RC ;
- le schéma Dexie reste en version 2 ;
- le format de sauvegarde JSON reste en version 2.

## Validation

```powershell
npm install
npm run check
```

La validation manuelle complète se trouve dans `RELEASE-CHECKLIST.md` et la procédure de retour arrière dans `ROLLBACK.md`.
