# Cadre de travail des agents — SportPilot

Ce fichier s’applique à tout le dépôt. Le dépôt GitHub
`Axelctrt/sport-nutrition-tracker` est la source de vérité. Les documents
canoniques sont indexés dans [`docs/INDEX.md`](docs/INDEX.md). Les notes de
version et documents suffixés par une version restent des archives utiles, pas
une description automatiquement actuelle.

## État de référence

- Version stable actuelle : SportPilot `1.0.0`.
- Branche de développement : `develop`.
- Base `develop` au moment de cette mise à jour :
  `d63f37374da9b02ffc44fbe9b019068fe768f318`.
- `main` contient la publication stable et peut recevoir uniquement les
  opérations explicitement autorisées de release/maintenance.
- Architecture : `src/domain`, `src/application`, `src/infrastructure`,
  `src/features`, `src/app`, `src/shared` et `src/pwa`.
- Stockage principal local : Dexie `AppDatabase`, version 12 au moment de cette
  mise à jour.
- Sauvegarde JSON : version 10 au moment de cette mise à jour.
- Runtime de synchronisation Dexie Cloud : version 16 au moment de cette mise à
  jour, activé uniquement par configuration.
- Backend : Cloudflare Pages Functions sous `functions/api`, avec D1 pour les
  domaines concernés.
- UI : mobile-first, local-first, hors ligne, système Performance Glass.

Toujours revérifier les HEAD, versions de schéma, configurations et services
réels avant de les citer ou de les modifier. Une ancienne conversation ou un
SHA inscrit ici ne remplace jamais cette vérification.

## Pilotage courant post-V1

Le référentiel principal du cycle post-V1 est
[`docs/roadmap/POST_V1_MASTER_PLAN.md`](docs/roadmap/POST_V1_MASTER_PLAN.md).

Le premier grand programme produit est **SportPilot Coach**. Il est découpé en
lots C0 à C11 et doit être exécuté lot par lot. Le MASTER PLAN décrit la
destination mais n'autorise jamais l'implémentation automatique du lot suivant.

Les lots de suppression, confidentialité, badges, Photo Nutrition, gouvernance,
maintenance et backlog post-V1 restent séparés et suivent les dépendances et
autorisations du MASTER PLAN.

Les anciennes références V1/RC restent des preuves historiques. Ne pas les
utiliser comme état courant.

## Règles impératives

1. Préserver la continuité des données. Ne jamais réutiliser une version Dexie
   publiée ni modifier une migration historique. Toute évolution ajoute une
   version, une migration, des tests et une stratégie de reprise adaptée.
2. Maintenir l’isolation entre espace invité, profil local et compte cloud.
   Aucun changement de compte ne doit exposer les données d’un autre espace.
3. Ne pas modifier les formules caloriques, macros, leurs versions, règles
   d'arrondi ou objectifs métier sans audit dédié et validation propriétaire
   explicite.
4. Ne pas modifier les thèmes validés, palettes globales ou contrats visuels
   structurants sans validation explicite.
5. Ne pas élargir le périmètre IA, les données envoyées ou les fournisseurs
   sans validation explicite, consentement adapté et revue de confidentialité.
6. Le Coach Engine doit rester déterministe, explicable, testable, local-first
   et fonctionnel hors ligne. Une IA conversationnelle éventuelle ne peut être
   qu'une couche d'explication.
7. L'IA Coach n'est autorisée que si son coût peut être garanti strictement à
   `0 EUR`, sans risque de dépassement, bascule payante ou débit automatique.
   À défaut, le lot IA est abandonné sans alternative payante.
8. Ne jamais placer de secret dans `VITE_*`, le dépôt, les logs ou la PWA.
9. Une fusion, un déploiement Preview ou production, un tag et une release
   exigent chacun une autorisation explicite. Une demande de code ou de PR ne
   les autorise pas implicitement.
10. Ne pas effacer, réinitialiser ou stasher les changements de l’utilisateur.
    Travailler autour d’un worktree sale et signaler tout chevauchement réel.
11. Ne jamais élargir silencieusement le périmètre d'un lot. Toute idée UX,
    refactor ou optimisation hors périmètre doit être reportée séparément.
12. Toute modification durable du plan Coach (calories/macros/programme) reste
    explicitement acceptée par l'utilisateur tant qu'une décision produit
    contraire n'a pas été validée.

## Façon de travailler

- Actualiser les références distantes avant de choisir une base.
- Partir de `develop` pour une évolution post-V1 ; réserver `main` aux
  opérations explicitement autorisées.
- Lire `AGENTS.md`, `docs/INDEX.md`, le MASTER PLAN, puis le code, les tests et
  les documents canoniques concernés avant d’écrire.
- Utiliser une branche dédiée et une PR vers `develop` sauf instruction
  explicite contraire.
- Un lot autorisé n'autorise pas le lot suivant.
- Distinguer dans toute proposition : **actuel**, **décision validée**,
  **planifié**, **idée à étudier**, **dette technique** et **abandonné**.
- Réutiliser les composants et contrats existants avant d’en créer de nouveaux.
- Mettre à jour la documentation canonique lorsque le comportement, un contrat,
  une commande, une version de données ou une procédure change.
- Auditer avant de modifier lorsque le périmètre touche données, sécurité,
  synchronisation, calculs, IA, navigation structurante ou comportement Coach.
- Conserver des PR petites, indépendantes et vérifiables.
- Une issue GitHub ouverte ne prouve pas qu'un défaut existe encore : revérifier
  code, commits, PR et comportement avant toute correction.

## Validation

Choisir les contrôles proportionnellement au risque :

- documentation seule : liens Markdown, chemins et commandes cités,
  contradictions, `git diff --check` et audits documentaires existants ;
- changement ciblé : tests concernés, lint et TypeScript/build si applicable ;
- interaction mobile : Chromium, WebKit iPhone 15, largeurs pertinentes,
  clavier, safe areas et mouvement réduit ;
- données/synchronisation/release : `npm run check`,
  `npm run test:stability`, tests PWA et audits métier associés ;
- Coach : tests métier déterministes, scénarios de confiance/données
  insuffisantes, non-régression des calculs, puis tests UI/E2E selon la surface.

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

## Autorité du MASTER PLAN

Le MASTER PLAN est un référentiel de roadmap, pas une permission d'exécution.
Pour chaque lot :

- le MASTER PLAN fournit le contexte ;
- le prompt courant définit l'autorisation et le périmètre ;
- la PR constitue le résultat auditable ;
- le propriétaire décide de la fusion, de la recette et du déploiement.
