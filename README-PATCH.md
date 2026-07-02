# SportPilot 0.21.1 — développement 0.22.0 E2

Branche de travail : `feature/full-account-continuity-0.22.0`

## Objet

Le lot E2 synchronise les récompenses, les thèmes visuels et les rappels entre les appareils d’un même compte. La version affichée reste `0.21.1` jusqu’à la publication finale 0.22.0 en E4.

## Données synchronisées

- badges obtenus, avec conservation de la date la plus ancienne ;
- thèmes visuels débloqués, sans retrait de progression ;
- thème visuel actif, selon la modification la plus récente ;
- missions hebdomadaires terminées ;
- préférences de rappels et heures calmes ;
- rappels terminés, sans doublon par date et type.

## Données restant locales

- thème clair, sombre ou système ;
- stockage persistant ;
- minuteur de repos, son et vibration ;
- activation automatique de la synchronisation ;
- métadonnées de sauvegarde.

## Garanties

- la progression est fusionnée par union et ne peut pas régresser ;
- les dates d’obtention ou de complétion les plus anciennes sont conservées ;
- un appareil neuf avec les valeurs par défaut n’écrase pas le cloud ;
- les préférences de rappels disposent d’un horodatage séparé des autres réglages ;
- le téléchargement recharge immédiatement les états Dexie et le thème visuel ;
- les comptes restent isolés par propriétaire cloud ;
- la restauration initiale inclut les états E2.

## Compatibilité

- application affichée : `0.21.1` pendant le développement ;
- base Dexie Cloud : v10 ;
- runtime local cloud : `sportpilot-sync-runtime-0.20.0-v10` ;
- schéma métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre local des espaces : v1.

Le changement de runtime v9 vers v10 peut demander une nouvelle authentification OTP. Aucune migration de la base métier ou de la sauvegarde n’est nécessaire.

## Contrôles

```powershell
npm ci
npm run check
npm run audit:rewards-routines-sync
```

La publication et le changement de version applicative restent réservés au lot E4.
