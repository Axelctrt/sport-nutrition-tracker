# Retour arrière — SportPilot 0.23.1

## Stratégie

Le fix-forward est privilégié. SportPilot 0.23.1 ne modifie aucun schéma de données : base métier Dexie v8, sauvegarde JSON v7, registre des espaces v1 et runtime cloud v10.

## Incident de notification

1. vérifier que l’action métier est réellement terminée ;
2. conserver les messages intégrés aux pages comme source de diagnostic ;
3. désactiver uniquement l’appel au toast défectueux ;
4. ne jamais annuler une écriture réussie uniquement parce que la notification manque ;
5. préparer une correction depuis le tag `v0.23.1`.

## Retour applicatif temporaire

Un déploiement temporaire du tag `v0.23.0` ne nécessite aucune migration inverse. Il retire le correctif transversal de notification mais conserve toutes les données et la synchronisation 0.23.0.

## Git

Ne jamais réécrire le tag `v0.23.1`. Conserver le tag publié et livrer chaque correctif avec une nouvelle version et un nouveau tag annoté.
