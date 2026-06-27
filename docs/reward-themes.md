# Thèmes visuels déblocables

SportPilot propose quatre palettes visuelles locales :

- SportPilot classique, disponible immédiatement ;
- Horizon endurance, débloqué après cinq activités de course, natation ou vélo ;
- Puissance, débloqué après cinq séances de musculation terminées ;
- Équilibre, débloqué après quatorze journées actives distinctes.

Les journées actives sont reconstruites depuis les activités, les séances de musculation terminées et les pesées. Les thèmes débloqués et le thème actif sont conservés dans le stockage local du navigateur sous la clé `sport-pilot.reward-themes`.

Un thème déjà acquis reste disponible après une réinitialisation sélective des données. Cette phase n’ajoute aucune table Dexie, aucune migration et aucune dépendance npm. Les thèmes clair, sombre et système continuent de fonctionner indépendamment de la palette récompense.
