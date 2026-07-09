# SportPilot 0.30.0 — U2B.5 Historique et synchronisation des liaisons

## Objectif

Cette phase durcit la liaison explicite entre une activité réelle et sa séance prévue après navigation, restauration ou synchronisation.

## Présélection depuis le planning

Le formulaire ne dépend plus uniquement de la liste générale des séances disponibles. L’identifiant transmis dans l’URL est résolu directement :

```text
planning → plannedSource + plannedId → résolution directe → présélection
```

Si la liste générale est temporairement indisponible mais que la séance demandée existe, la présélection reste fonctionnelle.

## Politique de réconciliation

La référence portée par l’activité réelle reste la source de vérité principale. Le champ `completedActivityId` de la séance planifiée constitue son miroir.

La réconciliation peut :

- restaurer un miroir manquant ;
- restaurer la référence d’une activité quand seul un miroir valide subsiste ;
- résoudre plusieurs activités revendiquant la même séance ;
- retirer une liaison incompatible avec le type de séance ;
- restaurer une séance simple planifiée quand son activité miroir a disparu.

Elle ne rapproche jamais deux données par simple date ou type d’activité.

## Synchronisation partielle

Pendant une synchronisation partielle, une référence vers une source momentanément absente est conservée. Elle pourra être complétée lorsque le domaine correspondant sera téléchargé.

Après une restauration complète, les références réellement orphelines peuvent être retirées, car l’ensemble du jeu de données est alors connu.

## Déclenchement

La vérification s’exécute :

- au démarrage de l’application ;
- après une synchronisation des activités ;
- après une synchronisation de la musculation ;
- après une restauration complète de sauvegarde locale.

Les erreurs de réparation restent non bloquantes : elles ne doivent jamais empêcher l’ouverture de l’application, une synchronisation ou une restauration réussie.

## Compatibilité

Aucune migration Dexie ou D1 n’est requise. Les champs introduits en U2B.4 restent optionnels et les données historiques sans liaison explicite demeurent valides.
