# Retour arrière — SportPilot 0.16.0-rc.1

## Objectif

Cette procédure permet de revenir à la version stable 0.15.0 si la Release Candidate présente un défaut bloquant, sans modifier manuellement IndexedDB.

## Préparation obligatoire

1. Exporter une sauvegarde JSON depuis 0.15.0 avant l’installation de la RC.
2. Conserver l’archive complète de 0.15.0 et l’archive complète de 0.16.0-rc.1.
3. Noter le commit et le tag `v0.16.0-rc.1`.
4. Vérifier que la sauvegarde est prévisualisable comme compatible.

## Retour du code

En cas de défaut bloquant :

1. arrêter le serveur ou retirer temporairement le déploiement RC ;
2. redéployer l’archive complète ou le tag stable `v0.15.0` ;
3. vider uniquement le cache applicatif si l’ancienne interface reste affichée ;
4. ne pas supprimer les données Safari ni IndexedDB ;
5. rouvrir SportPilot et vérifier le profil, les journaux, les séances et les sauvegardes.

## Données

Le schéma Dexie reste en version 2 et le format de sauvegarde reste en version 2. Aucun retour de migration n’est nécessaire entre 0.15.0 et 0.16.0-rc.1.

Une restauration JSON ne doit être lancée qu’après prévisualisation. Elle n’est pas nécessaire pour un simple retour du code si les données locales sont toujours présentes.

## PWA

Si la PWA continue d’afficher la RC après redéploiement de 0.15.0 :

1. fermer complètement la PWA ;
2. rouvrir Safari sur l’URL de production ;
3. recharger la page ;
4. relancer la PWA depuis l’écran d’accueil.

Ne supprimer la PWA ou les données du site qu’en dernier recours et uniquement après avoir vérifié la sauvegarde JSON.

## Git

Ne réécrire ni ne supprimer un tag déjà publié. Documenter le retrait de la RC, corriger sur une nouvelle branche et publier `0.16.0-rc.2` si nécessaire.
