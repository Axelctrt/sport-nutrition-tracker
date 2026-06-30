# Personnalisation des widgets de récompenses

Cette phase intègre les blocs de récompenses au moteur de personnalisation du
tableau de bord.

## Blocs concernés

- `rewardsOverview` : progression des badges et thèmes ;
- `weeklyMissions` : missions hebdomadaires et historique.

Ils peuvent désormais être :

- affichés ou masqués ;
- déplacés vers le haut ou vers le bas ;
- réorganisés avec les autres widgets ;
- configurés par les préréglages existants.

## Compatibilité

Les préférences déjà enregistrées sont normalisées automatiquement. Les deux
nouveaux identifiants sont ajoutés à la fin de l'ordre existant lorsqu'ils sont
absents.

Aucune migration Dexie et aucune modification du format de sauvegarde ne sont
nécessaires.
