# Retour arrière - SportPilot 0.35.1

SportPilot 0.35.1 n'ajoute aucune migration Dexie ou D1 et ne modifie aucun
format de données. La référence stable de départ reste le commit
`a413b8d92cdecb6e03eac7caca901e667e8c9801` de SportPilot 0.35.0.

## Avant toute action

- identifier le commit exact concerné ;
- conserver une sauvegarde des données accessibles ;
- vérifier les erreurs de session, le réseau et la reprise PWA ;
- ne supprimer, déplacer ou réinitialiser aucune base locale ;
- ne pas rejouer de migration.

## Stratégie

1. privilégier un correctif ciblé sur une branche dédiée ;
2. relancer les tests de session, d'espace de données et de reprise mobile ;
3. valider lint, TypeScript, Vitest, Playwright, build PWA et audits ;
4. demander un accord explicite avant toute publication.

Aucun retour arrière, tag ou déploiement n'est exécuté par la préparation de la
branche 0.35.1.
