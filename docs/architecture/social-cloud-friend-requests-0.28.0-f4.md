# SportPilot 0.28.0 F4 — Demandes d’amis cloud

## Objectif

La phase 0.28.0 F4 prépare les demandes d’amis cloud réelles à partir de la recherche exacte F3. Le handle public sert uniquement à retrouver un profil public. La demande elle-même est écrite avec les `userId` stables du demandeur et du destinataire.

## Périmètre livré

- contrat `socialCloudFriendRequest` version `0.28.0-f4` ;
- table runtime Dexie Cloud `socialFriendRequests` ;
- runtime Dexie Cloud prototype `v12` ;
- envoi de demande cloud `pending` ;
- lecture des demandes entrantes par `recipientUserId` ;
- lecture des demandes sortantes par `requesterUserId` ;
- mise à jour des statuts `pending`, `accepted`, `declined`, `cancelled` ;
- blocage des demandes vers soi-même ;
- blocage des doublons en attente ;
- fallback indisponible quand `VITE_ENABLE_REAL_SOCIAL_CLOUD=false` ;
- intégration optionnelle du port cloud dans le service d’envoi local existant.

## Table cloud

La table ajoutée au runtime prototype est :

```text
socialFriendRequests: id, requesterUserId, recipientUserId, status, requestedAt, updatedAt, [recipientUserId+status], [requesterUserId+status]
```

Cette table est volontairement séparée des profils publics et des futures amitiés. Une demande acceptée ne crée pas encore automatiquement une relation d’amitié cloud en F4.

## Statuts

Les statuts préparés sont :

```text
pending
accepted
declined
cancelled
```

L’acceptation cloud ne synchronise pas encore les permissions distribuées et ne publie aucun snapshot distant.

## Garde-fous

F4 conserve explicitement :

- pas d’annuaire public ;
- aucune suggestion ;
- aucun matching partiel ;
- aucune recherche approximative ;
- aucune amitié automatique ;
- aucune relation basée sur le handle ;
- aucun snapshot distant ;
- aucun export brut ;
- aucun like, commentaire, message, groupe ou classement.

## Règle d’identité

Le handle est une clé de recherche exacte. La relation et les demandes utilisent uniquement :

```text
requesterUserId
recipientUserId
```

Cela permet à un utilisateur de changer de handle sans casser les futures relations sociales.

## Hors périmètre F4

- création cloud des amitiés ;
- permissions distribuées ;
- publication de snapshots sociaux distants ;
- lecture d’un feed distant réel ;
- résolution complète des profils pour toutes les demandes entrantes ;
- politique de modération sociale.
