# SportPilot 1.0.3 — hotfix continuité Goals

Branche : `release/1.0.3`.

Base fonctionnelle qualifiée :
`develop@e4b0992ad3b524a529e6962f54407235263f6fa5`.

Tree fonctionnel qualifié :
`d4b8fd24466f04d4fee4e5966ec2b9edf1a69ba2`.

Stable publiée avant ce hotfix : SportPilot 1.0.2,
`main@6e479170731d689683822374ba7c74fff425730d`, tag `v1.0.2`.

## Correctifs Goals

- Les comptes historiques sans baseline et avec des Goals divergents restent en provenance `unknown` et strictement fail-closed.
- Un parcours dédié **Réconcilier les objectifs** permet une première réconciliation explicite : **conserver cet appareil** ou **utiliser le cloud**.
- L’aperçu montre les Goals concernés avec leur titre, leur état compréhensible sur cet appareil et dans le cloud, ainsi que la conséquence du choix global ; aucun jargon tombstone n’est exposé.
- La résolution revalide compte, état local, état cloud et stamp avant toute écriture ; une concurrence annule l’opération.
- La baseline n’est établie qu’après convergence vérifiée, afin que les changements suivants redeviennent `local-only` ou `cloud-only`.
- `both` reste sans résolution dans ce hotfix.
- Le merge générique et le CTA global ne peuvent plus contourner le fail-closed de Goals en `unknown` ou `both`.

## Persistance et automatisme

- `GOAL_STATE_CHANGED_EVENT` conserve sa sémantique de réactivité UI immédiate.
- `GOAL_STATE_PERSISTED_EVENT` signifie exclusivement qu’une mutation Goals locale est durablement persistée dans AppDatabase.
- Création/modification : signal après succès de persistance.
- Suppression : signal après transaction Goal + suppression durable réussie.
- Échec de persistance ou reload après download cloud : aucun signal persisted.
- Le gate nominal A → B utilise le vrai `writeGoalState()`, sans émission artificielle.

## Diagnostic

- Le détail Objectifs est réellement monté sur `/settings/sync-prototype`.
- La provenance réelle `local`, `cloud`, `both` ou `unknown` est visible.
- Aucune action directionnelle n’est proposée pour `unknown` ou `both` hors du parcours initial explicite autorisé pour `unknown` sans baseline.

## Qualification acquise avant bump

- CI post-merge develop #871 : 4/4 jobs verts.
- Preview fonctionnelle immuable : `https://e00b2869.sportpilot-pages.pages.dev`.
- Manifest SHA-256 : `79fdf99c183a519760e22fbfe03c406d5deb8f97b93782a340e8a90420deca53`.
- CORS de l’origine immuable : PASS ; alias : NOT_ALLOWED.
- Smoke physique Preview Goals A → B sans synchronisation manuelle : PASS.
- Le smoke physique du compte legacy divergent réel reste un gate post-déploiement sur l’origine production, où l’état IndexedDB historique existe encore.

## Invariants

- Synchronisation automatique sûre : Strength + Goals + Weights uniquement.
- `local-only` → upload directionnel ; `cloud-only` → download directionnel.
- `both` / `unknown` → aucune écriture automatique.
- Strength et Weights inchangés hors tests de non-régression.
- Dexie v12.
- sauvegarde JSON v10.
- runtime Dexie Cloud v16.
- aucune migration D1.
- aucune modification des formules calories/macros.
- aucun changement de thème validé.
- aucun élargissement IA.

Toute différence fonctionnelle hors de ce périmètre bloque la publication.
