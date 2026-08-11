# Cadre de travail des agents — SportPilot

Ce fichier s’applique à tout le dépôt. Le dépôt GitHub
`Axelctrt/sport-nutrition-tracker` est la source de vérité. Les documents
canoniques sont indexés dans [`docs/INDEX.md`](docs/INDEX.md) ; les notes de
version et les documents suffixés par une version restent des archives utiles,
pas une description automatiquement actuelle.

## État de référence

- Application publiée : SportPilot `0.37.0`.
- Commit fonctionnel déployé en production :
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a`.
- Branche `main` : elle peut contenir de la maintenance documentaire ultérieure
  au commit fonctionnel déployé ; toujours distinguer HEAD Git et SHA réellement
  servi en production.
- Publication : tag annoté `v0.37.0` et release GitHub stable `0.37.0`.
- Production : `https://sportpilot-pages.pages.dev`.
- Intégration constatée avant la Phase 0 V1 :
  `develop@eec97bf9ac776b519d051329551836853894fd82`.
- Source de vérité après clôture du Lot 8 et de l'issue #63 :
  `develop@3eff34a73cc40d98d3de2ab947ac8b45bfae5f01`.
- RC1 historique : `1.0.0-rc.1` au SHA
  `2fd781087a65e125b0e77edcd53d41fdf82922ed`, déployée une fois puis rejetée
  pour le blocker PWA #144.
- Candidate en préparation : SportPilot `1.0.0-rc.2`, depuis
  `develop@465f927c6ed17dd7537bfa83d6fe11e9329825ea`, sans Preview, fusion, tag,
  release ni déploiement autorisé par cette préparation.
- Architecture : `src/domain`, `src/application`, `src/infrastructure`,
  `src/features`, `src/app`, `src/shared` et `src/pwa`.
- Stockage principal local : Dexie `AppDatabase`, version 12.
- Sauvegarde JSON : version 10.
- Runtime de synchronisation Dexie Cloud : version 16, activé uniquement par
  configuration.
- Backend : Cloudflare Pages Functions sous `functions/api`, avec D1 pour le
  domaine social et ses limites photo.
- UI : mobile-first, local-first, hors ligne, système Performance Glass.

Toujours vérifier ces valeurs dans le code, GitHub et les services distants
avant de les modifier ou de les citer dans un nouveau document.

## Pilotage courant vers la V1

L’objectif stratégique validé est de stabiliser le périmètre existant puis de
publier SportPilot `1.0.0`. Aucun nouveau cycle fonctionnel ne doit être inséré
entre le programme de cohérence globale et la décision de readiness V1.

Les Phases 0 à 5 et les lots de convergence validés sont terminés. La Phase 6
conditionnelle n'a pas été requise : aucun défaut V1 critique ou significatif
reproductible ne restait dans le périmètre #63. La Phase 7 prépare maintenant
`1.0.0-rc.2` depuis le HEAD de `develop` qui intègre le correctif PWA #145.
RC1 reste rejetée. #146 est le gate CORS de la future recette Preview et #141
reste le gate avant la stable.

Toute Preview Cloudflare, fusion, modification de `main`, création de tag,
release GitHub ou mise en production demeure une gate séparée nécessitant une
autorisation explicite.

Lire en priorité
[`docs/roadmap/V1_READINESS_PLAN.md`](docs/roadmap/V1_READINESS_PLAN.md),
[`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md), l’issue #63 clôturée,
l'archive RC1 #142 et le journal RC2 #147.

L’audit doit distinguer défaut, risque, dette, recommandation UX, option et
surface conforme. Les recommandations qui changent réellement le produit
restent séparées des corrections de conformité.

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
- Pour le programme V1, auditer avant de modifier et conserver des PR petites,
  indépendantes et vérifiables.

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
