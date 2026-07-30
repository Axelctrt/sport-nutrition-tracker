# Retour arrière - SportPilot 0.36.0

SportPilot 0.36.0 n’ajoute aucune migration Dexie ou D1 et ne modifie aucun format de données. La référence de retour arrière de cette branche est le commit validé 0.35.1 :

```text
d067cb2fd718e0cd71d597398e6e1d3f57f3e973
```

## Avant toute action

- identifier le commit exact concerné ;
- conserver une sauvegarde des données accessibles ;
- vérifier les parcours Amis, Paramètres et Musculation ;
- ne supprimer, déplacer ou réinitialiser aucune base locale ;
- ne pas rejouer de migration.

## Stratégie

1. privilégier un correctif ciblé sur une branche dédiée ;
2. relancer les tests sociaux, de paramètres, de musculation et de continuité de session ;
3. valider lint, TypeScript, Vitest, Playwright, build PWA et audits ;
4. demander un accord explicite avant toute publication.

Aucun retour arrière, tag ou déploiement n’est exécuté par la préparation de la branche 0.36.0.
