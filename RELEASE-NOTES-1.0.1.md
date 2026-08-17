# SportPilot 1.0.1 — maintenance P0 continuité multi-appareils

Statut : candidate de maintenance préparée depuis
`develop@bec369ff7960dc897f7f34db42a6d8253a48ed36`, non taguée et non déployée au moment de cette note.

- Branche : `release/1.0.1`.
- Stable précédente publiée : SportPilot `1.0.0`, tag `v1.0.0`.
- Production de référence avant cette maintenance :
  `https://sportpilot-pages.pages.dev`.
- Aucun changement de schéma de données n'est inclus.

## Pour les utilisateurs

Cette maintenance fiabilise la continuité du compte entre appareils :

- synchronisation automatique sûre des séances de musculation entre appareils
  utilisant le même compte ;
- récupération plus sûre des données sur un nouvel appareil ;
- meilleure transparence de l'état réel de synchronisation ;
- conservation du fonctionnement local-first et hors ligne.

La synchronisation automatique directionnelle n'est **pas** étendue à toutes les
rubriques. Les primitives automatiques prouvées sûres restent limitées à
Strength / musculation.

## Garanties de synchronisation P0

- convergence distante sûre `cloud-only` ;
- upload sûr `local-only` ;
- provenance réelle contrôlée avant toute écriture directionnelle ;
- `both`, `unknown`, `equal` ou provenance opposée : no-op fail-closed ;
- protection CAS supplémentaire de l'upload contre un changement cloud entre
  l'analyse et l'écriture ;
- suppressions/tombstones et idempotence couvertes ;
- isolation invité / compte A / compte B préservée.

## Compatibilité des données

- Dexie v12, inchangée ;
- sauvegarde JSON v10, inchangée ;
- runtime Dexie Cloud v16, inchangé ;
- aucune migration Dexie ou D1 ;
- aucune suppression ou réinitialisation de données.

## Périmètre explicitement inchangé

- aucune modification des formules caloriques ou macros ;
- aucun changement de thème validé ;
- aucun élargissement IA ;
- aucune synchronisation cloud des photos de progression ;
- aucune analyse corporelle par IA ;
- aucun annuaire public, likes, commentaires, messagerie ou export d’activité brute.

## Gate de publication

La publication exige les gates release, la CI GitHub complète, une Preview
Cloudflare Pages Direct Upload du SHA exact, puis la PR `develop → main`.
Le tag `v1.0.1`, la GitHub Release et la production ne sont créés qu'après
validation des gates correspondants.
