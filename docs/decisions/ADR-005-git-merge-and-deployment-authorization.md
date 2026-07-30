# ADR-005 — Git et autorisations de publication

- Statut : Accepté
- Date : 2026-07-30

## Contexte

`main` représente la base publiée tandis que `develop` reçoit les évolutions.
Les plateformes connectées peuvent déclencher des actions externes à partir
d’une branche ou d’une pull request.

## Décision

- Vérifier les références distantes, tags et commits de production avant de
  choisir une base.
- Créer une branche dédiée depuis `develop` pour une évolution et ouvrir une PR
  vers `develop`.
- Préserver les commits de fusion et références de rollback.
- Une fusion, un déploiement Preview, un déploiement production, un tag et une
  release exigent chacun une autorisation explicite.
- L’autorisation de coder, pousser ou ouvrir une PR n’autorise aucune de ces
  actions de publication.

## Conséquences

Les agents s’arrêtent au jalon demandé. Un contrôle externe de Preview peut être
observé mais ne doit pas être relancé manuellement sans autorisation. Les
rapports identifient la base, les commits, les contrôles et les actions non
effectuées.
