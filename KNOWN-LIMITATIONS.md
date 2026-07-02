# Limitations connues — SportPilot 0.20.1

Ces limitations sont connues et non bloquantes pour la version stable.

## Synchronisation par domaine

Les activités, objectifs, musculation et domaines nutritionnels sont synchronisés depuis leurs panneaux respectifs. Les pesées conservent leur actualisation historique au démarrage. Il n’existe pas encore de bouton unique synchronisant tous les domaines dans un ordre automatisé.

## Espace invité

Les données créées dans l’espace invité restent conservées après connexion. Elles peuvent désormais être analysées puis fusionnées dans un compte existant sans effacer la source. Après l’import local, les envois vers le cloud restent déclenchés par domaine. D3 ajoute une restauration initiale groupée depuis le cloud, sans transformer l’import invité en synchronisation automatique.

## Données restant locales

Les récompenses, thèmes, missions et rappels restent locaux à l’espace actif. Ils ne constituent pas encore une sauvegarde cloud.

## Nouvelle installation

Une nouvelle installation peut désormais analyser puis restaurer en une opération les domaines déjà synchronisés. Cette restauration ne couvre pas les données qui restent volontairement locales : réglages non synchronisés, récompenses, thèmes, missions et rappels. Elle nécessite une connexion réseau et une confirmation explicite.

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

## 0.21.0 D1–D3

- La gestion du compte, l’import sécurisé de l’espace invité et la restauration guidée depuis le cloud sont disponibles.
- La restauration D3 couvre uniquement les domaines actuellement synchronisés et ne remplace pas une sauvegarde JSON complète.
- La liste des appareils distants dépend encore de métadonnées non exposées par le service cloud actuel.
