# Retour arrière - SportPilot 0.37.0

## Situation de la stable 1.0.0 en préparation

`1.0.0` est préparée depuis
`develop@13cef273d09d78eeb4d177ab23e86c7770748419`. Elle n'est ni fusionnée, ni
déployée, ni taguée, ni publiée. Aucun retour arrière de production n'est donc
déclenché par cette préparation ; la référence opérationnelle reste `0.37.0`.

RC1 (`1.0.0-rc.1`) a été déployée une seule fois depuis
`2fd781087a65e125b0e77edcd53d41fdf82922ed`, puis rejetée pour le blocker PWA
#144. Son correctif #145 est intégré dans RC2. RC2 a été gelée au SHA
`2554638a782f3be338b7323b95abc1078f65ef0b`, déployée une seule fois en Preview
puis acceptée dans #147. Ni RC1 ni RC2 n'ont remplacé la production et leurs
deployments historiques ne doivent pas être redéployés.

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
