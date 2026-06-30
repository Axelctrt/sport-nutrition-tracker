# Corbeille locale et annulation — lot 1

Cette phase protège les suppressions d'activités et de pesées.

## Principe

Lorsqu'une activité ou une pesée est supprimée, SportPilot exécute une seule
transaction Dexie qui :

1. copie l'enregistrement complet dans la table interne `trashItems` ;
2. retire l'enregistrement de sa table d'origine ;
3. annule toute l'opération si l'une des deux écritures échoue.

L'élément ne participe plus aux calculs, graphiques ou accomplissements pendant
qu'il se trouve dans la corbeille.

## Conservation

La durée de conservation est de 30 jours.

Les éléments expirés sont purgés lors de l'ouverture de la corbeille ou lors
d'une nouvelle suppression protégée. La date exacte de suppression définitive
est visible pour chaque élément.

## Restauration

Une restauration réinsère le snapshot original avec son identifiant, ses dates
et son contenu d'origine.

Pour une pesée, SportPilot refuse la restauration si une nouvelle pesée existe
déjà à la même date. Aucune donnée existante n'est écrasée silencieusement.

## Suppression définitive

La suppression définitive exige une seconde action explicite dans l'interface.
Elle ne restaure pas la donnée et retire uniquement le snapshot de corbeille.

## Sauvegarde

La corbeille est une table technique interne et n'est pas incluse dans la
sauvegarde JSON v3. Les données actives continuent d'être exportées comme
avant. Pour conserver un élément avant sa purge, il faut le restaurer puis
exporter une sauvegarde.

## Périmètre du lot 1

Protégé :

- activités ;
- pesées.

Prévu dans le lot suivant :

- entrées alimentaires ;
- séances et séries de musculation ;
- recettes et produits personnalisés ;
- modèles ;
- planifications.

## Versions

- nouvelle version Dexie non destructive ;
- format de sauvegarde JSON v3 inchangé ;
- aucune dépendance npm ;
- aucune donnée envoyée vers un serveur.
