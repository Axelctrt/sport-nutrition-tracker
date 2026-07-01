# SportPilot 0.19.0 — synchronisation sportive multiappareil

Branche de travail : `feature/sports-sync-0.19.0`

## Objet

Cette version étend la synchronisation Dexie Cloud aux activités, objectifs et données de musculation, en complément des pesées. Les espaces locaux restent physiquement isolés par compte et l’application demeure utilisable sans compte.

## Garanties

- synchronisation des pesées, activités, objectifs et musculation du compte actif ;
- filtrage strict par propriétaire cloud ;
- créations, modifications, suppressions et restaurations prises en charge ;
- absence de doublons après plusieurs synchronisations ;
- modèles et séances de musculation transférés comme agrégats complets ;
- aucune série orpheline ni séance partielle ;
- règles communes de comparaison et de résolution des conflits ;
- runtime Dexie Cloud versionné avec le schéma v5 ;
- schéma métier Dexie v8 inchangé ;
- sauvegarde JSON v7 inchangée.

## Contrôles

```powershell
npm run lint
npm run test
npm run build
npm run audit:sports-sync-release
npm run release:verify
```

## Validation manuelle

1. synchroniser une pesée entre deux navigateurs ;
2. créer, modifier et supprimer une activité ;
3. créer, modifier et supprimer un objectif ;
4. synchroniser un exercice personnalisé, un modèle et une séance complète ;
5. supprimer une série puis un exercice de séance ;
6. confirmer l’absence de doublons et de données orphelines ;
7. vérifier le retour à `0 différence` après chaque synchronisation ;
8. tester un changement de compte sans fuite de données ;
9. confirmer que nutrition, récompenses, thèmes et rappels restent locaux.


## 0.20.0 C1

Le journal nutritionnel est synchronisé par journée atomique via le runtime cloud v6. Les produits, recettes et favoris restent réservés à C2.
