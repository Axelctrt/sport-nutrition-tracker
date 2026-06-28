# Gestion avancée de la corbeille

Cette phase regroupe plusieurs améliorations dans un seul lot afin de rendre la
corbeille adaptée à un usage régulier et à des volumes de données plus élevés.

## Recherche et filtrage

La page permet désormais :

- une recherche locale par libellé ou type ;
- un filtre par type de donnée présent dans la corbeille ;
- un état explicite lorsqu'aucun élément ne correspond ;
- l'affichage du nombre d'éléments visibles et sélectionnés ;
- le nombre de jours restant avant l'expiration automatique.

## Sélection multiple

L'utilisateur peut sélectionner tous les résultats visibles, puis :

- restaurer la sélection ;
- supprimer définitivement la sélection.

La restauration groupée continue même lorsqu'un élément rencontre un conflit.
Les éléments non restaurés restent sélectionnés pour faciliter leur traitement.

## Vidage complet

Le bouton **Vider la corbeille** demande une confirmation avant toute action.

## Archive dédiée à la corbeille

Les éléments présents dans la corbeille ne sont pas mélangés aux sauvegardes
complètes SportPilot. Ils disposent d'un format dédié :

- format : `sportpilot-trash-archive` ;
- version : 1 ;
- extension : JSON ;
- taille maximale importée : 10 Mo.

Les archives peuvent être exportées manuellement puis réimportées.

## Protection avant suppression définitive

Avant :

- la suppression définitive d'un élément ;
- la suppression d'une sélection ;
- le vidage complet ;

SportPilot télécharge automatiquement une archive contenant exactement les
éléments concernés. Si la création de cette archive échoue, la suppression est
annulée.

## Import

L'import replace les éléments dans la corbeille et renouvelle leur délai de
conservation pour 30 jours. Les données ne sont pas restaurées directement
dans les journaux : l'utilisateur conserve le contrôle depuis la corbeille.

## Versions techniques

- Dexie : version 4 inchangée ;
- sauvegarde complète JSON : version 3 inchangée ;
- archive de corbeille : version 1 ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
