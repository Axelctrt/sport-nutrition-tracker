# Limitations connues — SportPilot 0.17.0

Ces limitations sont connues et ne sont pas considérées comme bloquantes pour
la version stable.

## Données locales

SportPilot stocke la majorité des données dans IndexedDB sur l’appareil.

La suppression des données Safari, la désinstallation complète de la PWA ou
certains nettoyages du navigateur peuvent supprimer ces données. Une sauvegarde
JSON régulière reste indispensable.

## Synchronisation cloud

La version 0.17.0 synchronise uniquement les pesées avec Dexie Cloud.

La nutrition, les activités, les séances de musculation, les objectifs, les
récompenses et les rappels restent locaux.

Les données locales ne sont pas compartimentées par compte dans un même profil
de navigateur. Lors d’un changement de compte :

- les pesées locales restent visibles ;
- la synchronisation est automatiquement bloquée ;
- une nouvelle autorisation explicite est obligatoire ;
- un compte différent ne doit être activé que dans un contexte local
  correspondant à ses propres données.

## Services externes

La recherche et l’actualisation Open Food Facts nécessitent une connexion réseau
et dépendent de la disponibilité ainsi que de la qualité des données du
service. Les produits locaux restent utilisables hors connexion.

## Scanner

L’accès à la caméra nécessite un contexte HTTPS sur iPhone.

Le scan peut être moins fiable avec un code endommagé, un éclairage faible ou
une mise au point difficile. La saisie manuelle du code-barres reste disponible.

## Sports d’endurance

Les activités ne sont pas importées depuis Garmin, Strava ou Apple Santé.

Les records sont calculés uniquement à partir des séances complètes enregistrées
et ne déduisent pas de temps intermédiaires absents.

## Notifications et minuteur

Le minuteur de repos fonctionne dans la session de la PWA.

Le son et la vibration dépendent des autorisations et restrictions d’iOS. Un
signal visuel reste toujours disponible.

## Retour arrière

SportPilot 0.17.0 utilise Dexie v8 et le format de sauvegarde JSON v7.

Un retour direct vers 0.16.0 n’est pas garanti compatible avec une base déjà
migrée. La procédure `ROLLBACK.md` privilégie une correction `0.17.1` sans
suppression des données locales.
