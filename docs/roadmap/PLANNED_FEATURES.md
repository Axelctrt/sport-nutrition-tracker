# Fonctionnalités et chantiers planifiés

## Terminé — Phase 2 : audit ciblé

L’audit de l’architecture, des données, de la synchronisation, de la PWA, des
parcours mobiles et de Performance Glass a été produit puis accepté comme base
de décision. Cette phase n’a pas modifié le comportement produit.

## Intégré — Phase 3 : fondations UX partagées

Les Phases 3A à 3E ont livré sur `develop` :

- les correctifs obligatoires issus de l’audit ;
- les variantes sémantiques de `EmptyState` ;
- une politique cohérente de feedback asynchrone ;
- un arbitre unique pour les bannières globales ;
- une primitive `ExpandableCard` évaluée sur les séances modèles.

Les références externes restent des inspirations selon
[`../product/UX_REFERENCES.md`](../product/UX_REFERENCES.md).

## Intégré sur `develop` — Phase 4 : photos de progression locales

La PR #18 a livré et validé sur `develop` le périmètre strict suivant :

- photos privées, locales et associées à la base de l’espace ouvert ;
- ajout avec date, vue, poids et note facultatifs ;
- redimensionnement, compression et miniatures dans le navigateur ;
- galerie compacte, filtres et comparaison tactile avant/après ;
- suppression individuelle ou complète ;
- archive photo séparée et restauration additive ;
- absence de publication sociale ;
- absence de synchronisation d’image cloud ;
- absence d’analyse corporelle ou d’extension IA.

La migration Dexie v12, les quotas, l’isolation des espaces, la restauration,
la continuité PWA, le clavier, WebKit et les largeurs mobiles sont couverts par
la CI complète et par la recette réelle iPhone/Safari. Cette intégration n’est
pas encore déployée en production.

Suivi UX non bloquant traité dans la PR de recette dédiée : l’ajout utilise un
seul bouton générique `Choisir une photo`, sans attribut `capture`, afin de
laisser Safari et les autres navigateurs proposer leurs choix natifs. Le
pipeline local de validation, compression et stockage reste inchangé.

## Idée à étudier — Phase 5 : déploiement contrôlé

Une activation progressive pourra être envisagée après validation réelle des
critères fonctionnels, de données, de performance et d’accessibilité. Le
mécanisme et les métriques ne sont pas encore décidés.

## Hors périmètre et abandonné pour cette séquence

- **Abandonné pour cette séquence** : photos de progression sociales.
- **Abandonné pour cette séquence** : stockage cloud des photos de progression.
- **Abandonné pour cette séquence** : estimation IA ou automatique de la
  composition corporelle.
- **Hors périmètre** : modification des formules caloriques.
- **Hors périmètre** : changement de fournisseur de synchronisation ou
  d’identité.

Une idée abandonnée ici ne peut revenir que par une décision explicite et une
mise à jour de la roadmap.
