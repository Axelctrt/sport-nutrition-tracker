# SportPilot 0.29.0 — A19 suppression d’un ami

## Objectif

Permettre à un utilisateur de supprimer lui-même une amitié active sans supprimer ses activités personnelles.

## Règles fonctionnelles

- l’action est disponible depuis la carte d’un ami connecté ;
- une confirmation explicite est demandée avant suppression ;
- côté serveur, l’amitié est conservée avec `status = 'removed'` ;
- les permissions de partage sont supprimées dans les deux directions ;
- les lectures du fil social restent protégées par la présence d’une amitié active ;
- côté client, l’ami, ses demandes associées et ses permissions locales sont retirés ;
- une indisponibilité serveur n’efface pas l’amitié distante ;
- en mode local uniquement, la suppression reste possible localement.

## Tables concernées

- `social_friendships` : passage de `active` à `removed` ;
- `social_friend_permissions` : suppression des lignes `A → B` et `B → A` ;
- aucune suppression des activités personnelles ;
- aucune migration de schéma D1 ou Dexie.

## Validation

Les tests couvrent :

- suppression locale d’un ami, de ses permissions et demandes associées ;
- mutation serveur D1 et refus si le demandeur n’est pas membre de l’amitié ;
- appel HTTP `/api/social-friends/remove` ;
- suppression depuis l’interface après confirmation.
