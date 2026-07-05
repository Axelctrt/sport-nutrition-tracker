# SportPilot 0.27.0 F5 — Fil d’activité amis

## Objectif

F5 introduit un premier fil d’activité amis minimal. Le fil ne lit pas les activités privées brutes : il consomme uniquement les snapshots sociaux filtrés livrés en F4.

## Périmètre livré

- Affichage d’un feed amis basé sur `SocialActivitySnapshot`.
- Distinction visuelle entre résumé et détail autorisé.
- Dégradation automatique d’un snapshot détaillé vers un affichage résumé si la permission ami actuelle ne permet plus le détail.
- États vides explicites : partage désactivé, aucun ami, aucune activité partagée.
- Garde-fou anti-fuite dans le modèle de feed : l’item affichable ne contient pas `sourceActivityId` ni les champs d’activité brute.

## Hors périmètre

- Pas de likes.
- Pas de commentaires.
- Pas de messagerie.
- Pas de groupes.
- Pas de classements.
- Pas de recherche globale d’utilisateurs.
- Pas de backend social inventé.
- Pas de synchronisation réelle des snapshots.

## Contrats ajoutés

- `SocialActivityFeedItem`
- `SocialActivityFeedState`
- `buildSocialActivityFeed`
- `prepareSocialActivityFeed`

## Règles de sécurité

Le feed reçoit des snapshots déjà filtrés. Il applique toutefois un second contrôle défensif :

1. si le partage global est désactivé, aucun item n’est affiché ;
2. si l’ami n’existe plus localement, le snapshot est ignoré ;
3. si un snapshot détaillé existe mais que la permission ami est repassée en résumé, l’affichage est limité au résumé ;
4. l’item affichable ne transporte pas l’identifiant source d’activité ;
5. aucun champ brut (`notes`, `time`, `rpe`, `manualCaloriesKcal`, `calculation`, `intervalDetails`) n’est affiché.

## Migrations

Aucune migration F5.

- Dexie reste en v10.
- Sauvegarde JSON reste en v9.

## Préparation F6

F6 devra finaliser la release 0.27.0 : bump version, notes de version, checklist, rollback, audits et publication.
