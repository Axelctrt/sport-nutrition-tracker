# Retour arrière — SportPilot 0.25.0

## Stratégie

Le fix-forward est privilégié. SportPilot 0.25.0 ne modifie aucun schéma de données : base métier Dexie v8, sauvegarde JSON v7, registre des espaces v1 et runtime cloud v10.

## Incident estimation photo

1. vérifier si l’incident concerne l’interface, la sélection photo, l’estimation locale ou l’ajout au journal ;
2. conserver les entrées nutritionnelles déjà créées par l’utilisateur ;
3. ne jamais supprimer l’historique alimentaire pour corriger un incident d’interface ;
4. désactiver temporairement le bouton Photo si le parcours bloque l’usage principal du journal ;
5. maintenir Open Food Facts, le scanner code-barres et l’ajout manuel comme voies de secours ;
6. préparer une correction depuis le tag `v0.25.0`.

## Confidentialité

La version 0.25.0 ne doit pas envoyer de photo vers un service externe. Tout correctif doit conserver ce principe tant qu’un backend IA explicite et consenté n’est pas livré.

## Retour applicatif temporaire

Un déploiement temporaire du tag `v0.24.0` ne nécessite aucune migration inverse. Il retire le parcours photo nutrition 0.25.0, mais conserve les données Dexie v8, les sauvegardes JSON v7 et le registre v1.

## Git

Ne jamais réécrire le tag `v0.25.0`. Conserver le tag publié et livrer chaque correctif avec une nouvelle version et un nouveau tag annoté.
