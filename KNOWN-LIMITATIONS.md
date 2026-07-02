# Limitations connues — SportPilot 0.21.0

Ces limitations sont connues et non bloquantes pour la version stable.

## Synchronisation par domaine

Les pesées, activités, objectifs, données de musculation et domaines nutritionnels conservent leurs panneaux de synchronisation manuelle. Il n’existe pas encore de bouton unique exécutant automatiquement tous les domaines dans leur ordre de dépendance.

## Espace invité

Les données invitées restent volontairement conservées après un import. Elles peuvent donc être importées explicitement dans un autre compte de la même installation. Aucune importation n’est automatique et chaque compte exige sa propre analyse et confirmation.

## Données restant locales

Les réglages non synchronisés, récompenses, thèmes, missions et rappels ne sont pas restaurés depuis Dexie Cloud. Une sauvegarde JSON complète reste nécessaire pour les conserver lors d’une réinstallation totale.

## Restauration initiale

La restauration groupée est réservée à un espace de compte vide ou ne contenant que des données recalculables. Lorsqu’une vraie donnée métier locale existe déjà, SportPilot bloque le remplacement global et demande d’utiliser les synchronisations par domaine.

## Appareils distants

La page **Compte et appareils** décrit l’appareil actuel. La liste complète des autres appareils et leur révocation distante ne sont pas encore exposées par l’interface.

## Conflits simultanés

La résolution utilise `updatedAt`, puis une comparaison déterministe en cas d’égalité. Il n’existe pas encore d’interface demandant à l’utilisateur de choisir manuellement entre deux modifications simultanées.

## Runtime local cloud

Une future évolution du schéma cloud créera un nouveau runtime IndexedDB local et pourra demander une nouvelle authentification OTP. Les anciennes bases locales ne sont pas supprimées automatiquement afin d’éviter toute destruction implicite.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité. L’espace actif reste utilisable hors connexion, mais l’analyse, l’import cloud et les synchronisations nécessitent une connexion.

## Versions de données

SportPilot 0.21.0 utilise la base Dexie Cloud v8 et le runtime `sportpilot-sync-runtime-0.20.0-v8`. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1.
