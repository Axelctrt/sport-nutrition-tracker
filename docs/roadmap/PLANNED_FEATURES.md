# Fonctionnalités et chantiers planifiés

## Terminé — Phase 2 : audit ciblé

L’audit de l’architecture, des données, de la synchronisation, de la PWA, des
parcours mobiles et de Performance Glass a été produit puis accepté comme base
de décision. Cette phase n’a pas modifié le comportement produit.

## Publié — Phase 3 : fondations UX partagées

Les Phases 3A à 3E sont publiées en production dans SportPilot 0.37.0 :

- les correctifs obligatoires issus de l’audit ;
- les variantes sémantiques de `EmptyState` ;
- une politique cohérente de feedback asynchrone ;
- un arbitre unique pour les bannières globales ;
- une primitive `ExpandableCard` évaluée sur les séances modèles.

Les références externes restent des inspirations selon
[`../product/UX_REFERENCES.md`](../product/UX_REFERENCES.md).

## Publié — Phase 4 : photos de progression locales

La PR #18 a livré le périmètre strict suivant, désormais publié dans SportPilot
0.37.0 :

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
la CI complète et par la recette réelle iPhone/Safari.

Le suivi UX de la PR #19 utilise un seul bouton générique
`Choisir une photo`, sans attribut `capture`, afin de laisser Safari et les
autres navigateurs proposer leurs choix natifs. Le pipeline local de
validation, compression et stockage reste inchangé.

## Terminé — Phase 5 : publication stable 0.37.0

La PR #21 a livré `develop` dans `main`. Le commit publié
`84fea3d49e68c7d190c00d505502a5c4aa2e672a` est référencé par le tag annoté
`v0.37.0`, la release GitHub stable et la production Cloudflare Pages. Aucune
migration D1 n’a été exécutée.

## Planifié — audit global UX et structure fonctionnelle

Un audit en lecture seule doit évaluer la structure de `Planning hebdomadaire`
et `Objectifs`, ainsi que la normalisation globale de SportPilot. Il doit
produire un rapport de décision et une roadmap de PR limitées, sans branche,
commit ou PR fonctionnelle avant validation explicite.

Amélioration UX non bloquante à conserver dans le périmètre d’analyse : dans la
page Amis, déplacer le statut de disponibilité de l’identifiant public
immédiatement sous le champ de saisie, avant les actions Copier et Enregistrer.

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
