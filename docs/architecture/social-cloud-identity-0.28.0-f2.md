# SportPilot 0.28.0 F2 — Identités cloud et réservation des handles

## Objectif

La phase 0.28.0 F2 prépare les identités sociales cloud nécessaires au vrai réseau SportPilot, sans activer de feed distant ni d’annuaire public.

Elle introduit deux collections du runtime Dexie Cloud :

- `socialIdentities` : profil public minimal rattaché au `userId` stable ;
- `socialHandleReservations` : réservation unique du handle exact, séparée du profil.

## Règles métier

- Le `handle` sert uniquement à retrouver un utilisateur par recherche exacte.
- Le `userId` reste la clé stable de relation, d’amitié et de permission.
- Un handle exact ne peut appartenir qu’à un seul `userId`.
- Un même `userId` peut changer de handle, mais l’ancienne réservation doit être libérée.
- Les handles invalides ou réservés sont refusés avant écriture.
- La recherche reste exacte : pas d’annuaire public, pas de suggestions et pas de recherche approximative.

## Données cloud F2

### `socialHandleReservations`

Chaque réservation contient :

- `id` : `social-handle:<handle>` ;
- `handle` : handle normalisé sans `@` ;
- `ownerUserId` : propriétaire stable ;
- `ownerDisplayName` : nom public minimal ;
- `reservedAt` ;
- `updatedAt`.

### `socialIdentities`

Chaque identité contient :

- `id` : identifiant technique de record cloud ;
- `userId` : identifiant social stable ;
- `handle` ;
- `displayName` ;
- `publicProfile` ;
- `handleReservationId` ;
- `handleReservedAt` ;
- `createdAt` ;
- `updatedAt`.

## Garde-fous

F2 ne livre pas :

- de demandes d’amis cloud réelles ;
- d’amitiés cloud ;
- de permissions distribuées ;
- de publication de snapshots ;
- de lecture de feed distant ;
- d’annuaire public ;
- de suggestions d’utilisateurs ;
- de likes, commentaires, messagerie, groupes ou classements ;
- aucun snapshot distant ;
- aucun export d’activité brute.

## Relation avec F1

F1 a défini le contrat cloud social global. F2 ajoute la première brique exploitable du contrat : identité cloud + réservation unique du handle exact.

Le flag `VITE_ENABLE_REAL_SOCIAL_CLOUD` reste la barrière d’activation. La configuration publique conserve le cloud social réel désactivé tant que les phases suivantes ne sont pas terminées.

## Validation

La phase est couverte par :

- `audit:social-cloud-contract` ;
- `audit:social-cloud-identity` ;
- `src/domain/friends/socialCloudIdentity.test.ts` ;
- `src/infrastructure/sync-prototype/realSocialCloudIdentityService.test.ts` ;
- `src/app/socialCloudIdentityReadiness.test.ts` ;
- `src/infrastructure/sync-prototype/SyncPrototypeDatabase.test.ts`.
