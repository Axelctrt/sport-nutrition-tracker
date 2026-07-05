# SportPilot 0.28.0 F3 — Recherche exacte utilisateur cloud

## Objectif

La phase F3 branche la recherche exacte d’un utilisateur SportPilot sur les identités cloud préparées en F2.

Le handle public sert uniquement à retrouver un profil public. La relation sociale future reste basée sur `userId`.

## Contrat livré

- `SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION = 0.28.0-f3`
- recherche exacte `@handle` uniquement ;
- statuts bornés : `found`, `notFound`, `invalidHandle`, `unavailable` ;
- adapter `createRealSocialCloudUserLookupGateway` branché sur les réservations `socialHandleReservations` ;
- gateway runtime protégé par `VITE_ENABLE_REAL_SOCIAL_CLOUD` ;
- fallback `unavailable` si le cloud social réel n’est pas activé.

## Ce que F3 ne fait pas

- pas d’annuaire public ;
- aucune suggestion ;
- aucun matching partiel ;
- aucune recherche approximative ;
- aucune création automatique d’amitié ;
- aucune demande d’ami cloud ;
- aucun snapshot distant ;
- aucun export brut d’activité.

## Sécurité

Un profil trouvé ne déclenche aucune relation sociale. La demande d’ami cloud sera traitée dans une phase ultérieure.

Le `handle` reste un point d’entrée public et modifiable. Le `userId` reste l’identifiant stable privé utilisé pour les futures relations.
