# Limitations connues — développement SportPilot 0.20.0 C2

Version stable publiée : **0.19.0**.

Ces limitations sont connues et non bloquantes pour la version stable.

## Synchronisation manuelle

Les activités, objectifs et données de musculation sont synchronisés manuellement depuis les paramètres. Les pesées conservent leur actualisation historique au démarrage. Il n’existe pas encore de bouton unique synchronisant tous les domaines.

## Données restant locales

Les bilans hebdomadaires, ajustements caloriques acceptés, récompenses, thèmes, missions et rappels restent locaux à l’espace de données actif. Le journal, les produits utiles, les recettes et les repas favoris sont synchronisés depuis C2. L’isolation par compte demeure assurée, mais ces domaines ne constituent pas encore une sauvegarde cloud.

## Nouvelle installation

Une nouvelle installation peut récupérer les domaines synchronisés après connexion et lancement des synchronisations correspondantes. Une restauration cloud entièrement automatisée de l’espace et de tous les domaines locaux n’est pas encore disponible.

## Appareils distants

La page **Compte et appareils** décrit l’appareil actuel. La liste cloud des autres appareils et leur révocation distante ne sont pas encore exposées.

## Conflits simultanés

La résolution utilise `updatedAt`, puis une comparaison déterministe en cas d’égalité. SportPilot ne propose pas encore d’interface demandant à l’utilisateur de choisir entre deux modifications simultanées.

## Runtime local cloud

Une évolution du schéma cloud crée un nouveau runtime IndexedDB local et peut demander une nouvelle authentification OTP. Les anciennes bases locales ne sont pas supprimées automatiquement afin d’éviter toute destruction implicite.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité. L’espace actif reste utilisable hors connexion, mais les synchronisations nécessitent le cloud.

## Versions de données

Le développement C2 utilise la base cloud v7 et le runtime `sportpilot-sync-runtime-0.20.0-v7`. Dexie métier reste en v8, la sauvegarde en JSON v7 et le registre local des espaces en v1.
