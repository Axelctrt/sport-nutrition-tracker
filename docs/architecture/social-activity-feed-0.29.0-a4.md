# SportPilot 0.29.0 A4 — File locale et cycle de vie des snapshots sociaux

## Décision d’architecture

Le nouveau contrat `0.29.0-a3` ne réutilise pas directement la table cloud historique
`socialActivitySnapshots` du prototype Dexie Cloud. Cette table contient l’ancien format
simplifié et pourrait déclencher une synchronisation avant que le contrat serveur et les
contrôles D1 soient validés.

A4 ajoute donc une base IndexedDB locale et isolée :

- base : `sportpilot-social-activity-snapshot-outbox` ;
- version : `1` ;
- table : `records` ;
- aucun addon Dexie Cloud ;
- aucun changement du schéma principal SportPilot ;
- aucune migration D1 ;
- aucune donnée brute d’activité.

Cette base est une file dérivée. Elle ne fait pas partie des sauvegardes utilisateur et ne
bloque jamais l’enregistrement métier d’une activité.

## Cycle de vie

Une clé de snapshot reste unique pour le quadruplet :

- propriétaire ;
- destinataire ;
- famille de source ;
- activité ou séance source.

### Création ou modification

La projection filtrée A3 est placée en file avec :

- `deliveryStatus: pending` ;
- une `mutationSequence` locale ;
- zéro tentative ;
- aucun payload métier brut.

Une projection identique est ignorée. Une projection différente remplace le record existant,
incrémente la séquence et réinitialise les métadonnées de livraison.

### Passage en privé, suppression ou révocation

Un snapshot déjà publié ou mis en file est remplacé par un tombstone minimal :

- `sourceDeleted` ;
- `sharingDisabled` ;
- `friendRevoked`.

Aucun tombstone n’est créé lorsqu’aucun snapshot local n’a jamais existé pour cette cible.

### Retry et concurrence

Les échecs utilisent un code borné et nettoyé, jamais un message serveur brut. Le prochain
essai est daté. Un accusé de réception n’est appliqué que si sa `mutationSequence` correspond
encore au record courant. Une modification locale plus récente ne peut donc pas être marquée
livrée par une réponse réseau obsolète.

## Hors périmètre A4

- branchement aux sauvegardes d’activité ;
- worker automatique de publication ;
- Pages Functions et D1 ;
- chargement du fil réel ;
- cache entrant ;
- interface de confidentialité ;
- migration de l’ancien snapshot cloud.
