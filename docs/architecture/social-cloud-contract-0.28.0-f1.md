# SportPilot 0.28.0 F1 — Contrat cloud social et readiness backend

## Statut

Cette phase prépare le backend social réel sans l’activer fonctionnellement.

F1 ajoute :

- un contrat TypeScript explicite pour le cloud social ;
- un flag dédié `VITE_ENABLE_REAL_SOCIAL_CLOUD` ;
- un adapter de readiness branché sur la configuration Dexie Cloud existante ;
- un backend indisponible volontaire pour conserver le comportement local sûr ;
- des audits anti-régression pour empêcher les dérives produit.

F1 ne livre pas encore :

- aucune demande cloud réelle ;
- aucun snapshot distant ;
- aucune synchronisation sociale entre deux comptes ;
- pas d’annuaire public ;
- pas de suggestions ;
- pas de likes, commentaires, messagerie, groupes ou classements.

## Collections cloud attendues

Le contrat prépare les collections suivantes, sans les créer dans Dexie local en F1 :

| Collection | Rôle |
|---|---|
| `socialIdentities` | profil public lié à un `userId` stable |
| `socialHandleReservations` | unicité et réservation des handles |
| `socialFriendRequests` | demandes d’amis cloud |
| `socialFriendships` | relations stables basées sur `userId` |
| `socialFriendPermissions` | permissions de partage par relation |
| `socialActivitySnapshots` | snapshots filtrés uniquement |

Aucune collection d’activité brute n’est prévue. Le feed réel devra consommer seulement des snapshots filtrés.

## Identité et stabilité

Le `handle` sert uniquement à rechercher un utilisateur avec une recherche exacte.

La relation d’amitié reste basée sur `userId` :

- `userId` : identifiant stable, privé, utilisé pour les relations ;
- `handle` : identifiant public, visible et modifiable sous conditions futures ;
- `displayName` : nom affiché.

## Garde-fous maintenus

Le contrat interdit explicitement :

- export brut d’activité ;
- annuaire public ;
- suggestions publiques ;
- likes ;
- commentaires ;
- messagerie ;
- groupes ;
- classements.

## Readiness

La readiness peut retourner :

- `disabled` : Dexie Cloud est désactivé ;
- `missingSyncBackend` : le socle cloud n’a pas d’URL exploitable ;
- `contractReady` : le contrat est prêt mais le cloud social réel peut rester désactivé ;
- `missingAuthenticatedUser` : le flag social est activé mais aucun utilisateur cloud n’est connu ;
- `unavailable` : état de repli générique.

En 0.28.0 F1, le comportement nominal côté utilisateur reste donc : contrat prêt, aucune écriture distante.

## Suite logique

La suite pourra avancer progressivement :

1. réservation réelle des handles ;
2. recherche exacte réelle par handle ;
3. demandes d’amis cloud ;
4. amitiés cloud ;
5. permissions synchronisées ;
6. publication et lecture de snapshots filtrés.
