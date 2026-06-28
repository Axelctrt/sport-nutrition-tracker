# Protection renforcée du stockage local

Cette phase ajoute la détection et la demande de stockage persistant via
l'API StorageManager du navigateur.

## Objectif

SportPilot utilise IndexedDB pour conserver les données sportives et
nutritionnelles. En mode standard, le navigateur peut théoriquement évincer
les données d'une origine lorsqu'il manque fortement d'espace.

Le mode persistant réduit ce risque : le navigateur ne doit plus supprimer
automatiquement le stockage de l'origine pour libérer de la place.

## États affichés

La page Sauvegarde indique l'un des états suivants :

- **Protection renforcée activée** : le stockage est persistant ;
- **Mode standard** : la persistance peut être demandée ;
- **API indisponible** : le navigateur ne propose pas cette fonctionnalité ;
- **Erreur de vérification** : le reste de l'application continue de
  fonctionner normalement.

## Demande utilisateur

La demande n'est déclenchée qu'après une action explicite sur le bouton
**Renforcer la protection**.

Le navigateur reste libre d'accepter ou de refuser selon ses propres règles.
Sur certains navigateurs, l'installation de la PWA et une utilisation
régulière augmentent les chances d'acceptation.

## Limites

La persistance :

- réduit le risque d'éviction automatique ;
- ne protège pas contre la suppression manuelle des données du navigateur ;
- ne protège pas contre la perte ou la panne de l'appareil ;
- ne remplace jamais un export JSON régulier.

## Versions

- Dexie : version 4 inchangée ;
- sauvegarde JSON : version 3 inchangée ;
- aucune nouvelle table ;
- aucune migration ;
- aucune dépendance npm supplémentaire.
