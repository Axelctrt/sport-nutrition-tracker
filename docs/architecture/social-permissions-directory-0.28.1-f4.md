# SportPilot 0.28.1 F4 — Permissions sociales serveur

## Objectif

Stabiliser les permissions sociales réelles après F2/F3 : les amitiés acceptées sont relues depuis D1 et les permissions résumé/détail sont persistées côté serveur.

## Endpoints ajoutés

- `GET /api/social-friends/friendships?userId=...`
- `GET /api/social-friends/permissions?userId=...`
- `POST /api/social-friends/permissions/save`

Les endpoints utilisent le binding Cloudflare D1 `SOCIAL_DIRECTORY_DB`.

## Règles de sécurité fonctionnelle

- Les amitiés sont créées uniquement par acceptation de demande.
- Les permissions sont sauvegardées uniquement pour deux comptes déjà amis actifs.
- Le résumé reste le niveau par défaut.
- Le détail nécessite `sharingLevel=detailed` et `detailedConsent=granted`.
- Revenir à résumé révoque le consentement détaillé côté serveur.
- Aucune activité brute n’est exposée par ces endpoints.

## Recette manuelle

1. Compte A et compte B sont amis.
2. Sur A, activer `Détaillé après accord` globalement.
3. Sur l’ami B, cliquer `Autoriser le détail`.
4. Recharger A : la permission doit rester détaillée.
5. Revenir à `Résumé uniquement`.
6. Recharger A : la permission doit redevenir résumé.

## Limite maintenue

La suppression complète d’ami n’est pas introduite dans F4. Elle devra être traitée dans une phase dédiée si l’UI de suppression d’amitié est ajoutée.
