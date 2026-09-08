# SportPilot 1.0.4 — continuité Activities + Goals both

Branche : `release/1.0.4`.

Base fonctionnelle qualifiée :
`develop@01d317dd62ddbbdc77002add1ccb7411d08049a2`.

Stable publiée avant cette maintenance : SportPilot 1.0.3,
`main@9c6ea1df7ea3f686020b7b86f49def0ecc85a9cd`, tag `v1.0.3`.

## Goals — résolution explicite de `both`

- `both` reste strictement fail-closed dans la synchronisation automatique et dans le merge générique.
- La résolution est exclusivement manuelle et explicite : **Conserver cet appareil** ou **Utiliser le cloud**.
- L’aperçu détaille les Goals concernés et la conséquence du choix avant écriture.
- Compte, baseline, digests local/cloud et stamp cloud sont revalidés juste avant l’écriture.
- Les écritures utilisent des CAS ; une concurrence annule l’opération.
- La baseline n’est reconstruite qu’après convergence vérifiée.
- Après convergence, une nouvelle mutation locale réelle peut reprendre le chemin automatique normal.
- Les mutations create/update/delete/restore sont inscrites dans un journal
  Dexie Cloud append-only avant tout cycle réseau ; chaque entrée possède un ID
  privé unique afin de préserver les deux côtés d’un conflit multi-appareils.
- Chaque mutation conserve son parent causal. Un head singleton non privé
  avance uniquement par CAS déclaratif si ce parent correspond encore.
- Une branche stale reste dans le journal sans pouvoir avancer le head ni faire
  accepter ses descendants. Deux branches offline suivent
  `FIRST_SERVER_ACCEPTED_CAS_WINS`.
- Aucun HLC, timestamp d’authentification, `Goal.updatedAt`, `$$ts` ou ordre
  d’arrivée observé ne choisit le gagnant.
- La migration locale v17 → v18 est additive et conserve le nom IndexedDB v16
  publié afin de préserver les files natives en attente.

## Activities

- Le domaine logique `activities` couvre les activités réalisées, le planning endurance et les suppressions/restaurations associées.
- Les écritures sont strictement directionnelles selon la provenance.
- `local-only` autorise uniquement l’upload ; `cloud-only` uniquement le download.
- `both` et `unknown` produisent zéro écriture automatique.
- Tombstones, restaurations, liens activité/planning, idempotence et isolation du compte sont conservés.
- Le signal de planning automatique n’est émis qu’après persistance durable.
- Les restaurations Activity depuis Undo, restauration groupée et Corbeille signalent l’automatisme uniquement après transaction réussie.
- Le gate automatisé A → B couvre une mutation durable A, son upload automatique puis la restauration sur un appareil B frais sans writeback cloud.

## Synchronisation automatique sûre

Whitelist publiée pour cette maintenance :

- Strength ;
- Goals ;
- Weights ;
- Activities.

Aucun cinquième domaine n’est ajouté.

## Qualification acquise avant préparation

- PR #179 : CI complète #890, 4/4 jobs SUCCESS.
- Playwright E2E exécuté intégralement sous le timeout de 75 minutes.
- Seed de stabilité `20260626` qualifié sous Linux / Node 22.16.0.
- CI post-merge de `develop@01d317dd62ddbbdc77002add1ccb7411d08049a2` : 4/4 jobs verts.
- La Preview immuable et le smoke physique restent des gates ultérieurs de la candidate 1.0.4.

## Invariants

- `local-only` → upload directionnel.
- `cloud-only` → download directionnel.
- `both` / `unknown` → aucune écriture automatique.
- Dexie v13.
- sauvegarde JSON v12.
- runtime Dexie Cloud v18, stockage existant migré en place.
- aucune migration D1.
- aucune modification des formules calories/macros.
- aucun changement de thème validé.
- aucun élargissement IA.

Toute différence fonctionnelle hors de ce périmètre bloque la publication.
