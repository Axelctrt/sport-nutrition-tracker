# Retour arrière — SportPilot 0.24.0

## Stratégie

Le fix-forward est privilégié. SportPilot 0.24.0 ne modifie aucun schéma de données : base métier Dexie v8, sauvegarde JSON v7, registre des espaces v1 et runtime cloud v10.

## Incident récompenses ou thèmes

1. vérifier si l’incident concerne uniquement l’affichage ou une règle de déblocage ;
2. conserver les données de progression et éviter toute suppression d’historique ;
3. désactiver le rendu de thème problématique plutôt que de réinitialiser les préférences ;
4. conserver les thèmes verrouillés comme non activables durablement ;
5. préparer une correction depuis le tag `v0.24.0`.

## Retour applicatif temporaire

Un déploiement temporaire du tag `v0.23.1` ne nécessite aucune migration inverse. Il retire les nouveaux badges, thèmes et réglages visuels 0.24.0, mais conserve les données Dexie v8, les sauvegardes JSON v7 et le registre v1.

## Git

Ne jamais réécrire le tag `v0.24.0`. Conserver le tag publié et livrer chaque correctif avec une nouvelle version et un nouveau tag annoté.
