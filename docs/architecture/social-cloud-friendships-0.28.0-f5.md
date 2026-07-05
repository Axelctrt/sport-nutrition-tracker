# SportPilot 0.28.0 F5 — Amitiés cloud et permissions synchronisées

## Objectif

La phase 0.28.0 F5 prépare la conversion d’une demande d’ami cloud acceptée en relation d’amitié cloud stable. La relation est toujours basée sur les `userId` internes et jamais sur le handle public.

## Périmètre livré

- Contrat `socialCloudFriendship` version `0.28.0-f5`.
- Table runtime Dexie Cloud prototype `socialFriendships`.
- Table runtime Dexie Cloud prototype `socialFriendPermissions`.
- Passage du runtime Dexie Cloud prototype en v13.
- Création d’une amitié active après acceptation explicite d’une demande.
- Lecture des amitiés par `userAId` et `userBId`.
- Synchronisation des permissions par `ownerUserId` et `friendUserId`.
- Niveau résumé par défaut.
- Détail uniquement après consentement explicite.

## Garde-fous

F5 ne livre pas :

- d’annuaire public ;
- de suggestions ;
- de matching partiel ;
- pas de relation basée sur handle ;
- pas de snapshot distant ;
- pas de feed distant réel ;
- de likes ;
- de commentaires ;
- de messagerie ;
- de groupes ;
- de classements ;
- pas d’export brut d’activité.

## Versions

- Application : `0.27.0` jusqu’à la release finale 0.28.0.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v13.
