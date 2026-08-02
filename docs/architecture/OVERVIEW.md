# Architecture générale

Statut : **actuel**, vérifié sur SportPilot 0.37.0 publié en production depuis
`main` au commit `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.

## Vue d’ensemble

SportPilot est une PWA React/TypeScript installable et utilisable hors ligne.
Le navigateur reste le premier lieu d’exécution et de stockage. Les services
cloud complètent certains parcours ; ils ne doivent pas rendre les parcours
locaux dépendants du réseau.

```text
UI React (`src/app`, `src/features`, `src/shared`)
  → cas d’usage (`src/application`)
  → modèles et règles (`src/domain`)
  → adaptateurs (`src/infrastructure`)
  → IndexedDB/Dexie, Dexie Cloud, HTTP same-origin

Cloudflare Pages
  → fichiers PWA construits dans `dist`
  → Pages Functions dans `functions/api`
  → D1 via le binding `SOCIAL_DIRECTORY_DB`
```

## Responsabilités des répertoires

- `src/domain` : modèles, invariants et calculs sans dépendance UI.
- `src/application` : services et orchestration des cas d’usage.
- `src/infrastructure` : Dexie, sauvegarde, synchronisation et gateways.
- `src/features` : pages, hooks, formulaires et composants par domaine.
- `src/app` : routage, providers, layouts et coordination globale.
- `src/shared` : composants, formulaires, graphiques, toasts et utilitaires.
- `src/pwa` : enregistrement, mise à jour et état hors ligne.
- `functions/api` : endpoints Cloudflare Pages Functions.
- `migrations` : migrations SQL D1, jamais réécrites après application.
- `scripts` : audits statiques et contrôles de release.
- `e2e` : parcours Playwright multi-projets.

## Entrées et construction

- `index.html` charge l’application principale.
- `vite.config.ts` configure React, Tailwind CSS, PWA/Workbox, proxies locaux,
  découpage des bundles et en-têtes de Preview.
- `src/app/routePaths.ts` centralise les chemins fonctionnels.
- `dist` est un artefact de build, pas une source à modifier.

## Domaines fonctionnels

Nutrition, activité/endurance, musculation, poids et pas, objectifs,
planification, bilans et assistant quotidien, sauvegarde/restauration,
corbeille, comptes/espaces de données, synchronisation, amis/confidentialité,
récompenses/thèmes, photos de progression locales et estimation nutritionnelle
par photo.

Le détail des statuts est dans
[`../product/FEATURE_CATALOG.md`](../product/FEATURE_CATALOG.md).

## Invariants d’architecture

- Les règles métier ne doivent pas dépendre de React.
- Les pages n’accèdent pas directement à D1.
- Les secrets restent côté serveur.
- Les opérations composées de musculation et de synchronisation conservent
  leurs agrégats atomiques.
- Les données historiques demeurent lisibles après une mise à jour PWA.
- Les composants partagés sont préférés aux variantes locales lorsqu’un
  contrat équivalent existe.
