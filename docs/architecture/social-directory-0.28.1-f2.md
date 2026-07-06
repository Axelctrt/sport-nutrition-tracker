# SportPilot 0.28.1 F2 — Annuaire social serveur

## Objectif

La recherche exacte d’amis ne doit plus dépendre de la visibilité inter-realm Dexie Cloud. Un compte A peut publier son handle public dans un annuaire serveur, puis un compte B peut résoudre ce handle exact vers un profil public minimal.

## Architecture retenue

- Front React : `VITE_SOCIAL_DIRECTORY_ENDPOINT=/api/social-directory`.
- Cloudflare Pages Functions :
  - `POST /api/social-directory/reserve`
  - `GET /api/social-directory/lookup?handle=...`
- Stockage serveur : Cloudflare D1 via le binding `SOCIAL_DIRECTORY_DB`.

## Données exposées

L’annuaire ne retourne que :

- `userId` public social SportPilot ;
- `handle` normalisé ;
- `displayName` ;
- dates techniques `createdAt` / `updatedAt`.

Aucune activité brute, nutrition, poids, note personnelle, métrique privée ou préférence de confidentialité n’est exposée.

## Variables

Front :

```env
VITE_SOCIAL_DIRECTORY_ENDPOINT=/api/social-directory
```

Serveur Cloudflare Pages Functions :

```env
SOCIAL_DIRECTORY_DB=<binding D1 Cloudflare, pas une variable texte>
```

Aucun secret Dexie Cloud ne doit être exposé en `VITE_*`.

## Limite volontaire F2

F2 résout uniquement l’annuaire exact des handles. Les demandes d’amis réellement visibles par le destinataire restent à valider/corriger en F3.
