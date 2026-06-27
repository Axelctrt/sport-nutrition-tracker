# Limitations connues — SportPilot 0.16.0-rc.1

Ces limitations ne sont pas considérées comme bloquantes pour la Release Candidate, mais doivent être connues avant publication.

## Données locales

SportPilot stocke les données dans le navigateur avec IndexedDB. La suppression des données Safari, la désinstallation complète de la PWA ou certains nettoyages du navigateur peuvent supprimer ces données. Une sauvegarde JSON régulière reste indispensable.

## Synchronisation

La version 0.16.0-rc.1 ne propose ni compte utilisateur, ni synchronisation cloud, ni synchronisation automatique entre plusieurs appareils.

## Services externes

La recherche et l’actualisation Open Food Facts nécessitent une connexion réseau et dépendent de la disponibilité ainsi que de la qualité des données du service. Les produits locaux restent utilisables hors connexion.

## Scanner

L’accès à la caméra nécessite un contexte HTTPS sur iPhone. Le scan peut être moins fiable avec un code endommagé, un éclairage faible ou une mise au point difficile ; la saisie manuelle du code-barres reste disponible.

## Sports d’endurance

Les activités ne sont pas importées depuis Garmin, Strava ou Apple Santé. Les records sont calculés uniquement à partir des séances complètes enregistrées et ne déduisent pas de temps intermédiaires absents.

## Notifications et minuteur

Le minuteur de repos fonctionne dans la session de la PWA. Le son et la vibration dépendent des autorisations et des restrictions d’iOS ; un signal visuel est toujours conservé.

## Release Candidate

Cette version est destinée à une validation approfondie avant la version stable 0.16.0. En cas de défaut bloquant, revenir à la version stable 0.15.0 avec la procédure de `ROLLBACK.md`.
