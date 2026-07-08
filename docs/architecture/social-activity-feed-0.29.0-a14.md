# SportPilot 0.29.0 A14 — Identité sociale canonique

## Incident observé

Après un effacement des données du site, un compte pouvait recréer localement un
`userId` de type `social-user:*` alors que Dexie Cloud utilisait un autre sujet
authentifié. Les amitiés D1, les permissions et l’outbox sociale pouvaient alors
référencer des identités différentes.

Conséquences :

- nom de l’ami remplacé par `Ami SportPilot` ;
- handle de secours `social-user...` ;
- outbox vide ou non livrable ;
- absence de `POST /api/social-activity-snapshots/sync` ;
- fil vide malgré une amitié visible.

## Décision

Le `userId` Dexie Cloud authentifié devient l’identifiant social canonique.

Avant de charger les demandes, amitiés et permissions, SportPilot appelle un
endpoint de réconciliation authentifié. Le serveur vérifie la propriété de
l’ancienne identité dans les tables privées Dexie Cloud, puis remplace les
anciens identifiants dans D1.

## Données réconciliées

- annuaire `social_directory_handles` ;
- demandes `social_friend_requests` ;
- amitiés `social_friendships` ;
- permissions `social_friend_permissions` ;
- snapshots `social_activity_snapshots`.

Les identifiants déterministes sont recalculés. Aucun nouveau modèle social et
aucune nouvelle table ne sont introduits.

## Sécurité

- endpoint protégé par jeton Dexie Cloud ;
- sujet JWT revérifié auprès de Dexie Cloud ;
- ancienne réservation de handle lue uniquement dans l’espace privé du compte ;
- conflit si le handle appartient à un compte non prouvé ;
- aucune reprise de handle sur la seule base d’un identifiant fourni par le navigateur ;
- aucune donnée métier brute ajoutée aux snapshots.

## Runtime

La réconciliation intervient :

1. à l’ouverture de la page Amis, avant le chargement du graphe social ;
2. avant la création ou la suppression d’un snapshot dans l’observer runtime.

La panne du service de réconciliation reste best effort : elle ne bloque pas
l’enregistrement sportif local.

## Migration

Aucune migration de schéma Dexie ou D1. La transformation des lignes existantes
est idempotente et peut être relancée grâce aux clés déterministes.
