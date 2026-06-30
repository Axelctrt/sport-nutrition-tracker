# Retour arrière — SportPilot 0.17.0

## Objectif

Cette procédure décrit la conduite à tenir si SportPilot 0.17.0 présente un
défaut bloquant après publication.

SportPilot 0.17.0 utilise le schéma Dexie v8 et le format de sauvegarde JSON v7.
La version 0.16.0 ne doit donc pas être redéployée sans validation explicite de
sa compatibilité avec une base locale déjà migrée.

Le **fix-forward** vers une version corrective `0.17.1` est la stratégie
préférée.

## Préparation obligatoire

1. Exporter une sauvegarde JSON v7 avant le déploiement de 0.17.0.
2. Conserver cette sauvegarde hors de l’application.
3. Noter les commits et tags `v0.16.0` et `v0.17.0`.
4. Vérifier que la sauvegarde est prévisualisable comme compatible.
5. Ne supprimer ni IndexedDB, ni les données Safari, ni la PWA.

## Mesure immédiate en cas de défaut de synchronisation

Si le défaut concerne uniquement Dexie Cloud :

1. ne pas supprimer les données locales ;
2. désactiver la synchronisation sur l’appareil concerné ;
3. ne pas autoriser un autre compte dans le même profil de navigateur ;
4. conserver les pesées locales et la sauvegarde JSON ;
5. préparer une correction sur une branche dédiée ;
6. publier une version corrective `0.17.1`.

## Retour du code

Un retour complet vers `v0.16.0` n’est autorisé qu’après un test confirmant que
cette version peut ouvrir sans risque une base déjà migrée au schéma v8.

À défaut de cette confirmation :

1. maintenir temporairement le déploiement 0.17.0 ;
2. désactiver la fonctionnalité défectueuse dans une correction 0.17.1 ;
3. déployer la correction sans supprimer les données locales.

## PWA et cache

Si une correction est déployée mais que l’ancienne interface reste affichée :

1. fermer complètement la PWA ;
2. ouvrir Safari sur l’URL officielle ;
3. recharger la page ;
4. relancer la PWA depuis l’écran d’accueil ;
5. ne supprimer les données du site qu’en dernier recours et seulement après
   vérification de la sauvegarde JSON.

## Données

- schéma Dexie principal : v8 ;
- sauvegarde JSON : v7 ;
- migrations automatiques ;
- aucune rétro-migration manuelle ne doit être tentée ;
- une restauration JSON ne doit être lancée qu’après prévisualisation.

## Git

Ne jamais réécrire ou supprimer un tag déjà publié.

Documenter le défaut, conserver `v0.17.0`, corriger sur une branche dédiée et
publier un nouveau tag `v0.17.1`.
