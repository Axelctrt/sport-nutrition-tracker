# SportPilot 0.26.0 F4 — finalisation release amis/confidentialité

## Objectif

Finaliser la publication 0.26.0 après les phases F1 à F3 : socle amis, persistance Dexie v9, sauvegarde JSON v8 et garde-fou social bloquant tout partage détaillé non consenti.

## Décisions de release

- La version applicative passe à `0.26.0`.
- Dexie reste en schéma v9.
- La sauvegarde reste en JSON v8.
- Les tables sociales locales restent `friendProfiles`, `friendRequests` et `friendsPrivacySettings`.
- Le runtime Dexie Cloud reste en v10 sans synchronisation sociale réelle.
- Le détail social reste bloqué jusqu’au consentement explicite par ami livré dans une version ultérieure.

## Validation attendue

- Tests ciblés amis/confidentialité.
- Audit `audit:friends-privacy`.
- Audit `audit:release`.
- Audit `audit:repository`.
- Build TypeScript/Vite.
- Check complet.
- Test de stabilité.
- Recette manuelle sur la page Amis et sur la sauvegarde JSON v8.

## Hors périmètre

- Flux d’activité partagé.
- Consentement par ami.
- Synchronisation sociale multi-compte.
- Export détaillé d’activités.
- Résolution de conflits sociaux multi-appareils.
