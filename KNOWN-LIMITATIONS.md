# Limitations connues — SportPilot 0.21.1

Ces limitations sont connues et non bloquantes pour la version stable.

## Objectif nutritionnel quotidien

Le tableau de bord recalcule l’objectif du jour à chaque ouverture. Depuis 0.21.1, un calcul identique ne renouvelle plus son horodatage et ne crée plus de différence artificielle avec le cloud. Une modification réelle du poids, des pas, des activités, du profil ou d’un ajustement calorique continue naturellement à produire une nouvelle version synchronisable.

## Synchronisation par domaine

Les pesées, activités, objectifs, données de musculation et domaines nutritionnels conservent leurs panneaux de synchronisation manuelle. Il n’existe pas encore de bouton unique exécutant automatiquement tous les domaines dans leur ordre de dépendance.

## Espace invité

Les données invitées restent volontairement conservées après un import. Elles peuvent donc être importées explicitement dans un autre compte de la même installation. Aucune importation n’est automatique et chaque compte exige sa propre analyse et confirmation.

## Données restant locales

Le profil et les réglages fonctionnels sont synchronisés depuis E1. Les préférences propres à l’appareil, récompenses, thèmes, missions et rappels restent locaux. Une sauvegarde JSON complète reste nécessaire pour conserver ces éléments lors d’une réinstallation totale.

## Restauration initiale

La restauration groupée est réservée à un espace de compte vide ou ne contenant que des données recalculables. Lorsqu’une vraie donnée métier locale existe déjà, SportPilot bloque le remplacement global et demande d’utiliser les synchronisations par domaine.

## Appareils distants

La page **Compte et appareils** décrit l’appareil actuel. La liste complète des autres appareils et leur révocation distante ne sont pas encore exposées par l’interface.

## Conflits simultanés

La résolution utilise `updatedAt`, puis une comparaison déterministe en cas d’égalité. Il n’existe pas encore d’interface demandant à l’utilisateur de choisir manuellement entre deux modifications simultanées.

## Runtime local cloud

E1 crée un nouveau runtime IndexedDB local v9 et peut demander une nouvelle authentification OTP lors de sa première ouverture. Les anciennes bases locales ne sont pas supprimées automatiquement afin d’éviter toute destruction implicite.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité. L’espace actif reste utilisable hors connexion, mais l’analyse, l’import cloud et les synchronisations nécessitent une connexion.

## Versions de données

La branche 0.22.0 E1 utilise la base Dexie Cloud v9 et le runtime `sportpilot-sync-runtime-0.20.0-v9`. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1.
