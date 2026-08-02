# Retour arrière - SportPilot 0.37.0

SportPilot 0.37.0 ajoute localement Dexie v12 avec les tables `progressPhotos` et `progressPhotoAssets`. La migration est additive et ne modifie aucune table historique. Aucune migration D1 n’est ajoutée. La référence de production stable reste le commit 0.36.0 :

```text
b47788fa9ee410d121ae2abf0704aa9a79e3eba3
```

## Risque de retour arrière

Après ouverture d’une base en v12, une ancienne application limitée à Dexie v11 peut refuser cette base avec une erreur de version IndexedDB. Un simple redéploiement 0.36.0 n’est donc pas une stratégie sûre pour les navigateurs déjà migrés.

## Avant toute action

- identifier le commit et l’environnement exacts ;
- conserver la base locale et, si possible, une archive photo séparée ;
- ne jamais supprimer, déplacer ou réinitialiser IndexedDB ;
- ne pas rejouer ou réécrire une migration historique ;
- ne lancer aucune migration D1.

## Stratégie

1. privilégier un correctif en avant compatible avec Dexie v12 ;
2. tester la migration depuis une base v11 réelle et l’isolation des espaces ;
3. tester galerie, comparateur, archive/restauration et continuité PWA ;
4. valider lint, TypeScript, Vitest, Playwright, build PWA et audits ;
5. demander un accord explicite avant toute publication.

Aucun retour arrière, tag, release GitHub ou déploiement de production n’est exécuté par la préparation de la branche 0.37.0.
