# Limitations connues — SportPilot 0.22.0

Ces limitations sont connues et non bloquantes pour la version stable.

## Objectif nutritionnel quotidien

Le tableau de bord recalcule l’objectif du jour à chaque ouverture. Un calcul identique conserve son horodatage. Une modification réelle du poids, des pas, des activités, du profil ou d’un ajustement calorique produit en revanche une version légitimement synchronisable dans le journal nutritionnel.

## Centre de synchronisation

Les neuf domaines sont traités séquentiellement afin d’éviter des accès concurrents au runtime cloud. Une synchronisation complète peut donc prendre plus de temps que l’action sur une rubrique unique. Les panneaux détaillés sont chargés uniquement à la demande.

## Espace invité

Les données invitées restent conservées après un import et peuvent être importées explicitement dans un autre compte de la même installation. Aucune importation n’est automatique.

## Données restant locales

Le mode clair, sombre ou système, le stockage persistant, le minuteur de repos, l’activation automatique et les métadonnées de sauvegarde restent propres à l’appareil. Le thème visuel SportPilot débloqué ou actif est, lui, synchronisé.

## Restauration initiale

La restauration groupée est réservée à un espace de compte vide ou ne contenant que des données recalculables. Lorsqu’une vraie donnée métier locale existe, SportPilot bloque le remplacement global et demande d’utiliser les synchronisations par domaine.

## Appareils distants

La page Compte et appareils décrit l’appareil actuel. La liste complète des autres appareils et leur révocation distante ne sont pas encore exposées par l’interface.

## Conflits simultanés

La résolution utilise les horodatages puis une comparaison déterministe en cas d’égalité. Il n’existe pas encore d’interface proposant de choisir manuellement entre deux modifications concurrentes.

## Runtime local cloud

Le runtime v10 peut demander une authentification OTP lors de sa première ouverture. Les anciens runtimes v8 et v9 ne sont pas supprimés automatiquement afin d’éviter toute destruction implicite du stockage local.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de leur disponibilité. L’espace actif reste utilisable hors connexion, mais l’analyse, la restauration cloud et les synchronisations nécessitent une connexion.

## Versions de données

SportPilot 0.22.0 utilise le runtime Dexie Cloud v10 et le runtime local `sportpilot-sync-runtime-0.20.0-v10`. La base métier reste en Dexie v8, la sauvegarde en JSON v7 et le registre local des espaces en v1.
