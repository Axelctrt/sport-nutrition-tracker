# Retour arrière — SportPilot 0.15.0

## Avant publication

1. Exporter une sauvegarde JSON depuis la page Sauvegarde.
2. Conserver les archives complètes `0.15.0` et `0.15.0-rc.1`.
3. Noter le commit stable et le tag `v0.15.0`.

## Retour arrière du code

```powershell
git switch develop
git log --oneline --decorate -10
```

En cas de défaut bloquant, redéployer le commit validé de `release/0.15.0-rc.1` ou son archive complète. Ne réécrire ni ne supprimer le tag `v0.15.0` après sa publication : documenter le retrait et préparer une version corrective `0.15.1`.

## PWA

Après redéploiement de la RC1 ou d’une version corrective :

1. fermer complètement la PWA ;
2. rouvrir l’application en ligne ;
3. accepter la mise à jour proposée ;
4. vérifier la version dans Paramètres ;
5. si le service worker reste bloqué, supprimer puis réinstaller l’icône depuis Safari.

## Données

Le schéma Dexie et la sauvegarde restent en version 2. Le passage entre l’alpha.13, la RC1 et la stable 0.15.0 ne nécessite aucune migration. Une restauration JSON ne doit être utilisée qu’avec une sauvegarde préalablement validée depuis la page Sauvegarde.

## En-têtes de sécurité

Si une incompatibilité de production apparaît, restaurer d’abord la version précédente de `public/_headers`, reconstruire puis redéployer. Ne désactiver la CSP qu’en dernier recours et uniquement le temps d’identifier la directive bloquante. Le schéma Dexie et les sauvegardes ne sont pas concernés par ce retour arrière.
## Retour arrière de la phase minuteur

La phase n’ajoute aucune table et ne modifie aucun index Dexie. Un retour au commit précédent ne nécessite donc aucune migration de données. Les trois préférences supplémentaires présentes dans `appSettings` seront simplement ignorées par une version antérieure. L’état actif du minuteur est temporaire et peut être supprimé en vidant la clé `sportpilot:rest-timer:*` de `sessionStorage`.


## Retour arrière des statistiques par type d’exercice

Cette phase n’ajoute aucune table et ne modifie aucun index Dexie. Les nouveaux champs sont facultatifs et les versions antérieures les ignorent. Un retour au commit précédent ne nécessite donc aucune migration. Les anciennes séries conservent leurs charges et répétitions ; les champs de durée et de distance nouvellement saisis resteraient présents dans IndexedDB et dans une sauvegarde JSON v2, mais ne seraient simplement pas exploités par l’ancienne interface.


## Retour arrière de la planification hebdomadaire

Cette phase n’ajoute aucune table et ne modifie aucun index Dexie. Les métadonnées `plannedDate`, `originalPlannedDate`, `plannedAt` et `skippedAt` sont facultatives. Un retour au commit précédent ne nécessite donc aucune migration structurelle.

Avant un retour arrière, terminer ou abandonner toute séance en cours et exporter une sauvegarde JSON. Une version antérieure ne connaît pas les statuts `planned` et `skipped` : les séances encore prévues ou non réalisées doivent donc être considérées comme non exploitables par l’ancienne interface. Les séances déjà démarrées ou terminées restent compatibles grâce à leur statut historique et à leurs exercices instantanés.
