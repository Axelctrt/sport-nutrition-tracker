# SportPilot 0.22.0 E1 — profil et réglages partageables

## Objectif

E1 ajoute un agrégat cloud unique par compte afin de retrouver sur un autre appareil le profil utilisateur et les préférences fonctionnelles qui influencent les calculs ou l’organisation de l’application.

L’interface reste provisoirement en version `0.21.1` pendant le développement de la roadmap `0.22.0`. La version applicative ne sera changée qu’au lot E4.

## Données synchronisées

L’agrégat `realAccountPreferences` contient :

- le profil utilisateur ;
- les paramètres de calcul énergétique et nutritionnel ;
- les coefficients d’activité ;
- les limites de calibration hebdomadaire ;
- les modèles d’endurance ;
- les préférences du tableau de bord.

## Données volontairement locales

Les réglages propres à l’appareil restent dans `deviceSettings` :

- thème clair, sombre ou système ;
- demande de stockage persistant ;
- cadence des rappels de sauvegarde ;
- minuteur de repos, son et vibration ;
- activation locale de la synchronisation automatique des pesées ;
- métadonnées de la dernière sauvegarde.

Les `routineReminderPreferences` restent également locales pendant E1. Elles seront traitées avec les récompenses, thèmes et rappels au lot E2.

## Horodatage partageable

`UserSettings.syncableUpdatedAt` suit uniquement les modifications partageables. Une modification limitée aux rappels peut renouveler `updatedAt`, mais ne renouvelle pas `syncableUpdatedAt` et ne crée donc pas de divergence cloud artificielle.

Les sauvegardes JSON v7 acceptent ce champ optionnel. Les anciennes sauvegardes utilisent automatiquement leur ancien `updatedAt` comme valeur de compatibilité.

## Résolution et restauration

- Une version réellement plus récente gagne par composant : profil ou réglages.
- Un espace neuf, sans profil et avec les réglages par défaut, est considéré comme non initialisé : il ne peut pas écraser un compte cloud existant.
- Lors d’un téléchargement de réglages, les préférences de rappel locales sont réinjectées avant l’écriture.
- La restauration après nouvelle installation exécute E1 avant les autres domaines.
- Des réglages strictement par défaut ne suffisent pas à déclarer qu’un espace contient des données utilisateur significatives.

## Versions de stockage

| Élément | Version après E1 |
|---|---:|
| Runtime Dexie Cloud | 9 |
| Nom du runtime local cloud | `sportpilot-sync-runtime-0.20.0-v9` |
| Base métier Dexie | 8 |
| Sauvegarde JSON | 7 |
| Registre des espaces | 1 |

Le changement de runtime cloud de v8 vers v9 ajoute uniquement la table `realAccountPreferences`. Il peut provoquer une nouvelle authentification OTP sur chaque appareil lors du premier lancement de cette branche.

## Contrôles attendus

- envoi initial puis seconde analyse à zéro différence ;
- téléchargement d’un profil ou de réglages cloud plus récents ;
- conservation du thème, du minuteur, du stockage et des rappels locaux ;
- absence de divergence après une modification limitée aux rappels ;
- restauration correcte sur une installation vide ;
- isolation stricte des comptes par propriétaire Dexie Cloud.
