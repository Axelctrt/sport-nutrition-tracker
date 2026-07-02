# SportPilot 0.21.1 — idempotence de l’objectif nutritionnel quotidien

## Incident

Le tableau de bord appelle `calculateAndPersistDailyTarget` à chaque ouverture. Le calcul retournait le même contenu métier, mais `DexieTargetRepository.upsertTarget` exécutait systématiquement une mise à jour et renouvelait `updatedAt`.

Le journal nutritionnel synchronise la journée comme un agrégat contenant repas, entrées, objectif et statut. Le nouvel horodatage de l’objectif rendait donc la journée différente du cloud alors qu’aucune donnée métier n’avait changé.

## Correction

Avant d’appeler `updateStoredEntity`, le dépôt compare désormais le contenu métier de l’objectif existant avec le nouveau calcul en ignorant uniquement :

- `id` ;
- `createdAt` ;
- `updatedAt`.

Les objets imbriqués sont normalisés par ordre de clé afin que l’égalité ne dépende pas de l’ordre de sérialisation.

Lorsque les contenus sont identiques, le dépôt retourne l’entité existante sans écriture. Lorsqu’une valeur métier diffère, le comportement historique est conservé et `updatedAt` est renouvelé.

## Invariants

- aucune donnée nutritionnelle n’est ignorée ;
- une vraie modification reste synchronisable ;
- le calcul du tableau de bord reste exécuté ;
- aucune migration Dexie n’est nécessaire ;
- aucun changement du schéma ou du runtime cloud ;
- la convergence du journal reste déterministe.
