# ADR-003 — Local-first, isolation et continuité des données

- Statut : Accepté
- Date : 2026-07-30

## Contexte

SportPilot fonctionne hors ligne et peut être utilisé comme invité, profil
local ou compte synchronisé. Les bases Dexie, migrations, sauvegardes et
restaurations portent des données personnelles dont la perte ou le croisement
entre espaces serait critique.

## Décision

- Le local-first et le fonctionnement hors ligne restent le comportement de
  base ; le cloud est conditionnel à la configuration et au consentement.
- Les espaces invité, profil local et compte sont isolés par leurs identifiants
  et leur cycle de vie.
- Une version de schéma publiée ou une migration historique n’est jamais
  réutilisée ni réécrite.
- Toute évolution de données ajoute migration, tests, compatibilité de
  sauvegarde/restauration et stratégie de retour en avant.
- Une restauration valide l’espace cible avant mutation et ne mélange pas les
  propriétaires.

## Conséquences

Les migrations additives et correctifs en avant sont préférés aux rollbacks de
schéma. Les évolutions de synchronisation ou de compte exigent des tests
multi-espaces, hors ligne, export, import et restauration.
