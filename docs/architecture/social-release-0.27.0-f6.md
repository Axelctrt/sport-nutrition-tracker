# SportPilot 0.27.0 F6 — finalisation release activité sociale

## Objectif

Finaliser la publication 0.27.0 après les phases F1 à F5 : identité sociale, demandes d’amis réelles préparées, permissions par ami, snapshots sociaux filtrés et premier fil d’activité amis.

## Périmètre confirmé

- version applicative `0.27.0` ;
- Dexie v10 ;
- sauvegarde JSON v9 ;
- fil d’activité amis alimenté uniquement par des snapshots filtrés ;
- garde-fou social conservé ;
- aucun export d’activité brute ;
- aucun backend social réel inventé ;
- aucune recherche globale ou annuaire ouvert ;
- aucun like, commentaire, message, groupe ou classement.

## Validation release

La phase F6 ajoute les documents de publication, réaligne les tests de version et renforce les audits pour que `check`, `ci`, `audit:release` et `audit:social-release` valident le nouveau périmètre.

## Publication

La publication reste manuelle : fusion de la branche `feature/activity-sharing-0.27.0` vers `develop`, puis `main`, création du tag annoté `v0.27.0` et resynchronisation de `develop` depuis `main`.
