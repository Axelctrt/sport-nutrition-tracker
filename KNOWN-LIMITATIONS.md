# Limitations connues — SportPilot 0.18.0

Ces limitations sont connues et non bloquantes pour la version stable.

## Synchronisation cloud

La version 0.18.0 synchronise uniquement les pesées avec Dexie Cloud. Les activités, la musculation, les objectifs, la nutrition, les récompenses, les thèmes et les rappels restent locaux dans leur espace de données respectif.

L’isolation locale par compte ne constitue donc pas encore une sauvegarde cloud complète de l’application.

## Restauration après nouvelle installation

La restauration complète d’un espace depuis le cloud n’est pas encore disponible. Sur un appareil neuf, seules les pesées synchronisées peuvent être récupérées. Le parcours complet de restauration est prévu dans la phase de cycle de vie du compte.

## Appareils distants

La page **Compte et appareils** décrit l’appareil actuel. La liste cloud des autres appareils et leur révocation distante ne sont pas encore exposées par SportPilot.

## Rattachement des données invitées

Le rattachement copie les données invitées vers le compte et conserve l’espace invité d’origine. Il n’existe pas encore d’outil de fusion entre deux espaces de comptes. Toute copie compte-vers-compte est volontairement refusée.

## Stockage local

La suppression des données du navigateur, de Safari ou de la PWA peut effacer les espaces locaux. Une sauvegarde JSON régulière reste indispensable.

## Services externes

Open Food Facts et Dexie Cloud dépendent du réseau et de la disponibilité de leurs services. L’application et les données de l’espace actif restent utilisables hors connexion, à l’exception des fonctions nécessitant explicitement le cloud.

## Versions de données

SportPilot 0.18.0 utilise Dexie v8, le format de sauvegarde JSON v7 et le registre local des espaces v1.
