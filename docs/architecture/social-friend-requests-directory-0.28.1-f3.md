# SportPilot 0.28.1 F3 — Demandes d’amis serveur

## Objectif

Rendre visibles les demandes d’amis entre deux vrais comptes SportPilot.

## Architecture

- Le lookup exact reste porté par `/api/social-directory`.
- L’envoi, la lecture entrante/sortante et la réponse à une demande passent par `/api/social-friend-requests/*`.
- Le stockage global est réalisé dans le binding D1 `SOCIAL_DIRECTORY_DB`.
- Aucun secret n’est exposé au front.

## Endpoints

- `POST /api/social-friend-requests/send`
- `GET /api/social-friend-requests/incoming?userId=<userId>`
- `GET /api/social-friend-requests/outgoing?userId=<userId>`
- `POST /api/social-friend-requests/update-status`

## Limites contrôlées

Cette phase règle l’inbox/outbox serveur des demandes. Les permissions sociales détaillées et le feed restent dans les phases suivantes.
