# Retour arrière - SportPilot 0.37.0

SportPilot 0.37.0 est la version actuellement publiée en production depuis
`main` au commit :

```text
84fea3d49e68c7d190c00d505502a5c4aa2e672a
```

Le tag annoté `v0.37.0` et la release GitHub 0.37.0 identifient cet état publié.
La version 0.36.0 reste uniquement une référence historique de repli :

```text
b47788fa9ee410d121ae2abf0704aa9a79e3eba3
```

SportPilot 0.37.0 ajoute localement Dexie v12 avec les tables
`progressPhotos` et `progressPhotoAssets`. La migration est additive et ne
modifie aucune table historique. Aucune migration D1 n’est ajoutée ou requise.

## Risque de retour arrière

Après ouverture d’une base en v12, une ancienne application limitée à Dexie
v11 peut refuser cette base avec une erreur de version IndexedDB. Un simple
redéploiement de 0.36.0 ou d’une version antérieure n’est donc pas une stratégie
sûre pour les navigateurs déjà migrés.

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
5. demander un accord explicite avant toute publication ou restauration.

Aucun retour arrière n’est exécuté par ce document. Les références 0.36.0 sont
conservées à des fins historiques et opérationnelles, sans indiquer l’état
courant de la production.
