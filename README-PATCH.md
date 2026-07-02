# SportPilot 0.21.1 — développement 0.22.0 E1

Branche de travail : `feature/full-account-continuity-0.22.0`

## Objet

Le lot E1 synchronise le profil utilisateur et les réglages fonctionnels entre les appareils d’un même compte. La version affichée reste `0.21.1` jusqu’à la publication finale 0.22.0 en E4.

## Données partageables

- profil et objectifs généraux ;
- paramètres de calcul énergétique et nutritionnel ;
- coefficients d’activité et limites de calibration ;
- préférences du tableau de bord ;
- modèles d’endurance.

## Données locales

- thème et stockage persistant ;
- minuteur de repos, son et vibration ;
- configuration locale de sauvegarde ;
- rappels et routines, traités au lot E2 ;
- récompenses, thèmes débloqués et missions, traités au lot E2.

## Garanties

- un espace neuf avec réglages par défaut n’écrase pas le cloud ;
- une modification limitée aux rappels ne renouvelle pas l’horodatage partageable ;
- le téléchargement conserve les réglages propres à l’appareil ;
- la restauration initiale inclut le profil et les réglages ;
- les comptes restent isolés par propriétaire cloud.

## Compatibilité

- application affichée : `0.21.1` pendant le développement ;
- base Dexie Cloud : v9 ;
- runtime local cloud : `sportpilot-sync-runtime-0.20.0-v9` ;
- schéma métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre local des espaces : v1.

Le changement de runtime v8 vers v9 peut demander une nouvelle authentification OTP. Aucune migration de la base métier ou de la sauvegarde n’est nécessaire.

## Contrôles

```powershell
npm ci
npm run check
npm run audit:account-preferences-sync
```

La publication et le changement de version applicative restent réservés au lot E4.
