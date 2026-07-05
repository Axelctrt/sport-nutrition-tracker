# SportPilot 0.28.0 F6 — Snapshots sociaux distants filtrés

## Objectif

La phase `0.28.0 F6` prépare la publication cloud de snapshots filtrés et la lecture des snapshots autorisés pour alimenter le feed amis réel.

Elle ne publie jamais une activité brute : les snapshots sont déjà réduits au périmètre résumé ou détail filtré selon les permissions synchronisées.

## Principes

- La publication utilise le `ownerUserId` du compte courant.
- Le destinataire est le `publishedForUserId`, dérivé du `friendId` ciblé par le snapshot local.
- Le feed entrant rattache le snapshot au `ownerUserId` distant pour afficher l’activité comme venant de l’ami.
- Le résumé reste le niveau par défaut.
- Le détail nécessite toujours un consentement explicite.
- La relation reste basée sur `userId`, jamais sur le handle.

## Runtime Dexie Cloud prototype

Le runtime Dexie Cloud prototype passe en `v14` et ajoute la table :

```text
socialActivitySnapshots
```

Index principaux :

```text
ownerUserId
publishedForUserId
sourceActivityId
activityType
date
scope
[publishedForUserId+date]
[ownerUserId+publishedForUserId]
```

La base applicative locale reste inchangée :

```text
AppDatabase Dexie v10
Sauvegarde JSON v9
Version applicative 0.27.0 jusqu’à la release finale
```

## Garde-fous

F6 interdit explicitement :

- pas d’activité brute ;
- pas de feed brut ;
- pas d’export brut d’activité ;
- pas de notes d’activité ;
- pas d’horaires précis libres ;
- pas d’annuaire public ;
- pas de suggestions ;
- pas de likes ;
- pas de commentaires ;
- pas de messagerie ;
- pas de groupes ;
- pas de classements.

## Hors périmètre

F6 ne modifie pas la base locale principale et ne crée aucun mécanisme social public.

La phase prépare le partage réel d’activités uniquement via snapshots sociaux distants filtrés, lisibles selon les permissions synchronisées.
