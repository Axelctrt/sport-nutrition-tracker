# SportPilot 0.18.0 — isolation complète des données par compte

Branche de travail : `feature/account-data-spaces-0.18.0`

## Objet

Cette version introduit un espace IndexedDB physiquement distinct pour l’utilisateur invité et pour chaque compte connecté. La barrière de compte est montée avant les providers métier afin qu’aucune donnée de l’espace précédent ne soit chargée pendant une connexion, une déconnexion ou un changement de compte.

## Garanties

- utilisation complète de l’application sans compte ;
- conservation de la base historique comme espace invité ;
- aucune association automatique des données invitées ;
- choix explicite entre rattachement non destructif et espace vide ;
- refus technique de toute copie compte-vers-compte ;
- noms de bases dérivés d’empreintes opaques, sans email ni jeton ;
- déconnexion, désassociation locale et suppression locale séparées ;
- aucune migration du schéma Dexie v8 ;
- aucune modification du format de sauvegarde JSON v7 ;
- synchronisation cloud toujours limitée aux pesées.

## Contrôles

```powershell
npm run lint
npx vitest run src/infrastructure/data-spaces/accountDataIsolation.integration.test.ts
npm run audit:account-isolation
npm run check
```

## Validation manuelle

1. vérifier la conservation de l’espace invité après mise à jour ;
2. rattacher explicitement les données invitées à un premier compte ;
3. se déconnecter et confirmer le retour à l’espace invité ;
4. reconnecter le premier compte et ouvrir son espace existant ;
5. connecter un second compte avec un espace vide ;
6. confirmer qu’aucune donnée du premier compte n’apparaît ;
7. valider la page **Compte et appareils** ;
8. tester la désassociation puis la réassociation ;
9. tester la suppression locale uniquement avec un compte de test.
