# Retour arrière — SportPilot 0.15.0-rc.1

## Avant déploiement

1. Exporter une sauvegarde JSON depuis la page Sauvegarde.
2. Conserver l’archive complète de la dernière version validée.
3. Noter le commit et le tag déployés.

## Retour arrière du code

```powershell
git switch release/0.15.0-rc.1
git log --oneline -5
```

Revenir au commit validé précédent uniquement après avoir confirmé que la sauvegarde utilisateur est disponible. Déployer ensuite l’archive complète correspondante.

## PWA

Après retour arrière :

1. fermer complètement la PWA ;
2. rouvrir l’application en ligne ;
3. accepter la mise à jour proposée ;
4. si nécessaire, supprimer puis réinstaller l’icône depuis Safari ;
5. vérifier la version dans Paramètres.

## Données

Le schéma Dexie et la sauvegarde restent en version 2. Aucun retour de code entre l’alpha.13, la RC1 et la stable 0.15.0 ne nécessite de migration. En cas d’anomalie de données, utiliser uniquement une sauvegarde JSON validée depuis la page Sauvegarde.
