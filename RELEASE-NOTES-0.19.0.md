# SportPilot 0.19.0

## Synchronisation sportive multiappareil

SportPilot synchronise désormais, pour le compte connecté :

- les pesées ;
- les activités sportives ;
- les objectifs ;
- les exercices personnalisés ;
- les séances modèles et leurs exercices ;
- les séances réalisées, leurs exercices et leurs séries.

Chaque domaine conserve une analyse sans écriture et une synchronisation manuelle depuis **Paramètres → Synchronisation des données**.

## Cohérence et conflits

- résolution déterministe par `updatedAt`, puis par valeur stable lorsque les horodatages sont identiques ;
- métadonnées techniques Dexie Cloud exclues des comparaisons ;
- identifiants privés stables et absence de doublons après plusieurs synchronisations ;
- filtrage strict par propriétaire cloud ;
- suppressions propagées par marqueurs durables ;
- restauration possible lorsqu’une donnée modifiée est plus récente qu’un ancien marqueur de suppression ;
- règles communes de comparaison partagées par les pesées, activités, objectifs et données de musculation.

## Musculation atomique

Les modèles et séances sont transférés comme des agrégats complets. L’application transactionnelle empêche :

- une séance sans ses exercices ;
- une série sans son exercice de séance ;
- une série rattachée à une autre séance ;
- la résurrection d’une série ou d’un exercice supprimé.

## Runtime Dexie Cloud

- base cloud en version 5 ;
- runtime IndexedDB local versionné avec le schéma courant ;
- synchronisation implicite Dexie Cloud désactivée au profit des contrôleurs SportPilot ;
- nouvelle authentification locale attendue lors d’un changement de runtime, sans suppression des données métier ni des données cloud.

## Compatibilité

- schéma Dexie principal inchangé en v8 ;
- sauvegarde JSON inchangée en v7 ;
- registre des espaces locaux inchangé en v1 ;
- données nutritionnelles, récompenses, thèmes et rappels toujours locaux à leur espace de compte.
