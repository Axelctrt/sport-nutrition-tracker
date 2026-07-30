# SportPilot 0.35.1

SportPilot 0.35.1 sécurise la reprise des sessions mobiles et conserve l’espace local du compte hors ligne ou pendant une indisponibilité cloud, sans modifier les thèmes validés, les formules caloriques ni le périmètre de l’analyse IA.

L’application reste mobile-first, locale-first, hors ligne et installable en PWA.

## Principales évolutions

### Onboarding et compte

- date de naissance proposée par défaut, avec l’âge disponible comme alternative ;
- validation OTP avec états réels ;
- sauvegarde et reprise du brouillon ;
- protection contre les doubles soumissions ;
- passage direct au profil pour un compte neuf ;
- identité sociale demandée uniquement lorsqu’elle devient nécessaire dans Amis ;
- révélation finale « Tout est prêt » synchronisée avec la création du profil.

### Feedback et traitements longs

- toasts Performance Glass pressables, dédupliqués et contextualisés ;
- suppression des confirmations redondantes ;
- progression multi-étapes fondée sur les jalons réels d’import invité et de restauration cloud ;
- destinations cohérentes après les actions terminées.

### Parcours secondaires

- nouvelle chronologie de l’Historique ;
- navigation interne d’Amis entre Fil, Amis, Demandes, Mon profil et Diagnostic ;
- page Rappels compacte avec édition dépliable ;
- navigation commune entre Aliments, Recettes, Repas favoris, modèles et exercices ;
- parcours guidés pour les rapports et la restauration de sauvegarde.

## Stockage et versions techniques

- Application : `0.35.1`.
- AppDatabase locale : Dexie v11.
- Sauvegarde JSON : v10.
- Runtime Dexie Cloud prototype : v16.
- Contrat de snapshot social : `0.29.0-a3`.
- Migrations D1 ajoutées par 0.35.1 : aucune.
- Migrations Dexie ajoutées par 0.35.1 : aucune.

## Contrôles de publication

```text
npm run lint
npx tsc -b --pretty false
npm run test
npm run build
npm run test:e2e
npm run audit:release-consolidation
npm run check
npm run test:stability
npm audit
```

La recette couvre 126 scénarios Playwright sur Chromium desktop, WebKit iPhone 15 et les formats mobiles 320, 360, 393 et 412 px.

Tag attendu : `v0.35.1`.
