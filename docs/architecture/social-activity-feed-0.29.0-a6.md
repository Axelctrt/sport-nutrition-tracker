# SportPilot 0.29.0 A6 — persistance cloud D1 des snapshots sociaux

## Statut et périmètre

A6 rend la file locale A4/A5 livrable vers Cloudflare Pages Functions et D1. Cette sous-phase ne crée encore aucune interface de fil d’activité et ne déploie ni migration ni code en production.

Le flux devient :

```text
activité ou séance terminée
→ projection locale filtrée
→ outbox IndexedDB persistante
→ jeton Dexie Cloud du compte connecté
→ Pages Function same-origin
→ contrôle serveur du compte, de l’amitié et des permissions
→ upsert D1 par snapshot déterministe
```

## Endpoints préparés

```text
POST /api/social-activity-snapshots/sync
GET  /api/social-activity-feed
GET  /api/social-activity-snapshots/detail?snapshotId=...
```

La carte du fil ne renvoie pas le bloc `detail`. Le détail est chargé séparément et reste déjà filtré par le propriétaire avant persistance.

## Authentification serveur

Le navigateur transmet le jeton d’accès de la session Dexie Cloud dans l’en-tête `Authorization: Bearer ...`.

La Pages Function :

1. exige un bearer ;
2. lit le sujet `sub` du jeton ;
3. valide le jeton auprès de la base Dexie Cloud configurée ;
4. refuse tout snapshot dont `ownerUserId` diffère du sujet authentifié.

La variable serveur suivante est requise avant un déploiement réel :

```text
DEXIE_CLOUD_DATABASE_URL
```

Aucune valeur n’est enregistrée dans Git par A6.

## Contrôles de confidentialité

Le serveur ne fait pas confiance au masquage React. Avant toute écriture, il contrôle :

- la version du contrat `0.29.0-a3` ;
- les clés exactes du snapshot ;
- les champs autorisés par famille ;
- la cohérence entre `allowedFields`, `summary` et `detail` ;
- l’absence récursive des notes et commentaires privés ;
- la clé déterministe propriétaire/source/destinataire ;
- l’identité du propriétaire authentifié ;
- l’existence d’une amitié active ;
- la permission ami actuelle ;
- le consentement détaillé lorsque le snapshot dépasse le résumé.

À la lecture, l’amitié et la permission sont revérifiées. Une amitié supprimée coupe immédiatement l’accès. Une permission abaissée de `detailed` vers `summary` rend les anciens snapshots détaillés illisibles, même avant leur remplacement par un nouveau résumé.

## Cycle de vie et idempotence

La table conserve une ligne par :

```text
owner_user_id + source_kind + source_activity_id + recipient_user_id
```

La clé applicative `snapshot_id` reste déterministe. La séquence de mutation permet :

- la création ;
- la mise à jour ;
- l’idempotence d’une nouvelle tentative ;
- le rejet d’un même numéro de séquence avec un contenu différent ;
- l’acquittement d’une mutation locale déjà dépassée sur le serveur.

Un tombstone peut révoquer une ligne existante après la suppression d’une amitié. Un tombstone sans ligne serveur existante est acquitté sans créer de donnée inutile.

## Migration D1

Migration préparée :

```text
migrations/0001_social_activity_snapshots_0_29_0.sql
```

Elle crée :

- `social_activity_snapshots` ;
- l’unicité source/destinataire ;
- l’index du fil entrant ;
- l’index propriétaire.

La migration n’est pas appliquée pendant A6. Son exécution devra être décidée après validation de la branche et avant le premier test réel entre deux comptes.

## Runtime client

`AutomaticSyncCoordinator` attache un livreur best effort qui se déclenche :

- au démarrage ;
- lors d’un changement de session cloud ;
- au retour en ligne ;
- au focus de la PWA ;
- lorsqu’une mutation est ajoutée à l’outbox.

Les déclenchements simultanés sont regroupés. Une erreur sociale est absorbée et ne bloque jamais les fonctions sportives locales.

## Pagination

Le fil utilise un curseur opaque et un tri stable :

```text
occurredAt/occurredOn DESC
updatedAt DESC
snapshotId DESC
```

La limite par défaut est 20 et la limite maximale 50.

## Limites encore ouvertes

A6 ne couvre pas encore :

- l’écran réel du fil ;
- le cache entrant hors ligne ;
- les réglages globaux complets et les surcharges par activité ;
- la résolution avancée des conflits simultanés multi-appareil ;
- les réactions, commentaires, notifications ou défis.

Ces éléments restent réservés aux sous-phases suivantes.
