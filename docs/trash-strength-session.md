# Corbeille musculation — séries et exercices de séance

Cette phase étend la corbeille aux suppressions destructives actuellement
disponibles pendant une séance de musculation.

## Éléments protégés

- série supprimée ;
- exercice retiré d'une séance ;
- toutes les séries liées à l'exercice retiré.

## Suppression d'une série

Le snapshot conserve la série complète avant sa suppression.

La suppression garde le comportement existant : les séries restantes sont
renumérotées de façon continue.

Lors de la restauration, SportPilot réinsère la série à son numéro d'origine.
Si ce numéro est déjà utilisé, les séries suivantes sont décalées d'une
position afin de ne rien écraser.

## Retrait d'un exercice de séance

Le snapshot contient :

- l'exercice de séance ;
- son ordre ;
- son nom enregistré ;
- sa configuration ;
- toutes ses séries.

La suppression de l'exercice et de ses séries est réalisée dans la même
transaction que la création du snapshot.

La restauration exige que la séance d'origine existe toujours. En cas de
collision d'ordre, les exercices suivants sont décalés sans être supprimés.

## Conflits

La restauration est refusée lorsque :

- l'exercice parent d'une série n'existe plus ;
- la séance parent d'un exercice n'existe plus ;
- un identifiant d'exercice ou de série est déjà utilisé.

En cas de refus, le snapshot reste dans la corbeille.

## Éléments non concernés

Les séances complètes et les modèles ne disposent pas actuellement d'une
suppression destructive globale dans leurs dépôts.

Les exercices du catalogue et les modèles utilisent un état d'archivage ou
une modification de configuration. Ils ne sont donc pas transformés en
suppression définitive dans ce lot.

## Versions

- Dexie : version 4 inchangée ;
- sauvegarde JSON : version 3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
