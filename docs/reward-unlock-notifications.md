# Notifications de déblocage des récompenses

## Objectif

Afficher immédiatement une confirmation lorsqu'une action utilisateur débloque un badge ou un thème visuel, sans obliger l'utilisateur à ouvrir les paramètres avancés.

## Fonctionnement

Le composant global `RewardUnlockNotifier` est monté dans `App` à l'intérieur des fournisseurs applicatifs. Il utilise `Dexie.liveQuery` pour observer les lectures des tables suivantes :

- `activities` ;
- `workoutSessions` ;
- `weights`.

Lorsqu'une de ces tables change, les moteurs de badges et de thèmes recalculent les seuils. Seules les récompenses qui n'étaient pas déjà conservées dans le stockage local sont annoncées.

## Notifications

- Un badge unique affiche son nom et sa description.
- Plusieurs badges obtenus lors de la même opération sont regroupés dans une seule notification.
- Un thème unique indique qu'il peut être activé depuis les paramètres avancés.
- Plusieurs thèmes sont regroupés dans une seule notification.

Les notifications utilisent le `ToastProvider` existant, durent huit secondes et restent fermables manuellement.

## Persistance et sécurité

Les règles de persistance existantes restent inchangées :

- badges : `sport-pilot.achievements` ;
- thèmes : `sport-pilot.reward-themes`.

Une récompense déjà acquise n'est pas annoncée une seconde fois après un rechargement. Aucune table, migration ou dépendance npm n'est ajoutée.
