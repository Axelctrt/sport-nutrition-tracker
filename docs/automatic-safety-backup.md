# Sauvegarde automatique avant une opération destructive

Cette phase crée et télécharge une sauvegarde JSON complète avant trois
opérations susceptibles de remplacer ou d'effacer plusieurs tables.

## Opérations protégées

- import d'une sauvegarde qui remplace les données présentes ;
- suppression complète des données locales ;
- réinitialisation sélective d'une ou plusieurs catégories.

## Ordre d'exécution

SportPilot suit cet ordre strict :

1. lecture de toutes les données exportables ;
2. création du JSON de sécurité ;
3. déclenchement du téléchargement ;
4. seulement ensuite, lancement de l'opération destructive.

Si la préparation ou le déclenchement du téléchargement échoue, l'opération
destructive n'est pas exécutée.

## Noms des fichiers

Les fichiers utilisent un préfixe explicite :

- `sportpilot-securite-avant-import-...` ;
- `sportpilot-securite-avant-effacement-complet-...` ;
- `sportpilot-securite-avant-reinitialisation-...`.

## Rappel de sauvegarde

Une sauvegarde automatique de sécurité ne modifie pas la date de la dernière
sauvegarde volontaire. Le rappel global continue donc de représenter les
exports explicitement demandés par l'utilisateur.

## Limites

Le navigateur déclenche un téléchargement local. L'utilisateur doit conserver
le fichier dans Fichiers, iCloud Drive ou un autre emplacement durable.

## Versions

- Dexie : version 4 inchangée ;
- sauvegarde JSON : version 3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
