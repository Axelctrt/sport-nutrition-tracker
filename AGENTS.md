# Cadre de travail des agents — SportPilot

Ce fichier s’applique à tout le dépôt. Le dépôt GitHub
`Axelctrt/sport-nutrition-tracker` est la source de vérité. Les documents
canoniques sont indexés dans [`docs/INDEX.md`](docs/INDEX.md) ; les notes de
version et les documents suffixés par une version restent des archives utiles,
pas une description automatiquement actuelle.

## État de référence

- Application : SportPilot `0.37.0` publiée en production depuis `main` au
  commit `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.
- Publication : tag annoté `v0.37.0` et release GitHub stable `0.37.0`.
- Production : `https://sportpilot-pages.pages.dev`.
- Architecture : `src/domain`, `src/application`, `src/infrastructure`,
  `src/features`, `src/app`, `src/shared` et `src/pwa`.
- Stockage principal local : Dexie `AppDatabase`, version 12.
- Sauvegarde JSON : version 10.
- Runtime de synchronisation Dexie Cloud : version 16, activé uniquement par
  configuration.
- Backend : Cloudflare Pages Functions sous `functions/api`, avec D1 pour le
  domaine social et ses limites photo.
- UI : mobile-first, local-first, hors ligne, système Performance Glass.

Toujours vérifier ces valeurs dans le code et les services distants avant de
les modifier ou de les citer dans un nouveau document.

## Règles impératives

1. Préserver la continuité des données. Ne jamais réutiliser une version Dexie
   publiée ni modifier une migration historique. Toute évolution ajoute une
   version, une migration, des tests et une stratégie de retour arrière.
2. Maintenir l’isolation entre espace invité, profil local et compte cloud.
   Aucun changement de compte ne doit exposer les données d’un autre espace.
3. Ne pas modifier les formules caloriques, leurs versions ou leurs règles
   d’arrondi sans audit métier dédié et validation explicite.
4. Ne pas élargir le périmètre IA, les données envoyées ou les fournisseurs
   sans validation explicite, consentement adapté et revue de confidentialité.
5. Ne jamais placer de secret dans `VITE_*`, le dépôt, les logs ou la PWA.
6. Une fusion, un déploiement Preview ou production, un tag et une release
   exigent chacun une autorisation explicite. Une demande de code ou de PR ne
   les autorise pas implicitement.
7. Ne pas effacer, réinitialiser ou stasher les changements de l’utilisateur.
   Travailler autour d’un worktree sale et signaler tout chevauchement réel.

## Façon de travailler

- Actualiser les références distantes avant de choisir une base.
- Partir de `develop` pour une évolution ; réserver `main` à la base publiée.
- Pour une maintenance documentaire post-release décrivant l’état publié,
  partir de `main`, ouvrir une PR dédiée vers `main`, puis resynchroniser
  `develop` depuis `main` par merge, sans rebase ni réécriture d’historique.
- Utiliser une branche dédiée et une PR vers la branche cible appropriée.
- Lire le code, les tests, les audits et les documents canoniques concernés
  avant d’écrire.
- Distinguer dans toute proposition :
  **actuel**, **décision validée**, **planifié**, **idée à étudier**,
  **dette technique** et **abandonné**.
- Réutiliser les composants et contrats existants avant d’en créer de nouveaux.
- Mettre à jour la documentation canonique lorsque le comportement, un contrat,
  une commande, une version de données ou une procédure change.

## Validation

Choisir les contrôles proportionnellement au risque :

- documentation seule : liens Markdown, chemins et commandes cités,
  contradictions, `git diff --check` et audits documentaires existants ;
- changement ciblé : tests concernés, lint et TypeScript/build si applicable ;
- interaction mobile : Chromium, WebKit iPhone 15, largeurs pertinentes,
  clavier, safe areas et mouvement réduit ;
- données/synchronisation/release : `npm run check`,
  `npm run test:stability`, tests PWA et audits métier associés.

Commandes de référence :

```text
npm ci
npm run lint
npm run test
npm run test:stability
npm run build
npm run test:e2e
npm run test:e2e:pwa
npm run check
```

Ne jamais présenter un contrôle interrompu, expiré ou non exécuté comme réussi.
Documenter les avertissements préexistants séparément des régressions.

## Sécurité et opérations

- Consulter [`docs/security/SECURITY_AND_PRIVACY.md`](docs/security/SECURITY_AND_PRIVACY.md)
  avant toute évolution cloud, sociale, IA, sauvegarde ou compte.
- Consulter
  [`docs/operations/ENVIRONMENTS_AND_DEPLOYMENT.md`](docs/operations/ENVIRONMENTS_AND_DEPLOYMENT.md)
  avant toute action d’environnement.
- Consulter
  [`docs/operations/INCIDENT_AND_RECOVERY.md`](docs/operations/INCIDENT_AND_RECOVERY.md)
  pour une restauration ou un incident de données.
- Préférer un correctif en avant à un rollback qui ferait régresser un schéma.
