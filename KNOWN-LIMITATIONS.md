# Limitations connues — SportPilot 0.20.1

Ces limitations sont connues et non bloquantes pour la version stable.

## Synchronisation par domaine

Les activités, objectifs, musculation et domaines nutritionnels sont synchronisés depuis leurs panneaux respectifs. Les pesées conservent leur actualisation historique au démarrage. Il n’existe pas encore de bouton unique synchronisant tous les domaines dans un ordre automatisé.

## Espace invité

Les données créées dans l’espace invité restent conservées dans cet espace après connexion à un compte. Elles réapparaissent après déconnexion, mais une importation sécurisée dans un espace de compte déjà existant n’est pas encore disponible.

## Données restant locales

Les récompenses, thèmes, missions et rappels restent locaux à l’espace actif. Ils ne constituent pas encore une sauvegarde cloud.

## Nouvelle installation

Une nouvelle installation peut récupérer les domaines synchronisés après connexion et lancement des synchronisations correspondantes. Une restauration cloud entièrement automatisée de l’espace, de ses réglages et de tous les domaines locaux n’est pas encore disponible.

## Appareils distants

La page **Compte et appareils** décrit l’appareil actuel. La liste cloud des autres appareils et leur révocation distante ne sont pas encore exposées.

## Conflits simultanés

La résolution utilise `updatedAt`, puis une comparaison déterministe en cas d’égalité. SportPilot ne propose pas encore d’interface demandant à l’utilisateur de choisir entre deux modifications simultanées.

## Runtime local cloud

Une évolution du schéma cloud crée un nouveau runtime IndexedDB local et peut demander une nouvelle authentification OTP. Les anciennes bases locales ne sont pas supprimées automatiquement afin d’éviter toute destruction implicite.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité. L’espace actif reste utilisable hors connexion, mais les synchronisations nécessitent le cloud.

## Versions de données

SportPilot 0.20.1 utilise la base cloud v8 et le runtime `sportpilot-sync-runtime-0.20.0-v8`. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1.
