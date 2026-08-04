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

## Intégré à `develop`, non publié — Profil, Amis et Confidentialité

La PR #24 a été fusionnée dans `develop` au commit
`f66efc2798117e861c7b59b66b50ab1cd88ba6bc`. Son HEAD fonctionnel validé est
`6eed04863ff2c11611aac281fc04a91011f8a175`.

Le périmètre intégré est limité à :

- un profil général initialement consultable en lecture seule ;
- une action `Modifier` ouvrant une surface d’édition dédiée ;
- le même contrat lecture seule / édition pour le profil social ;
- la protection des modifications non enregistrées ;
- le statut de disponibilité de l’identifiant public directement sous son
  champ ;
- un toast temporaire unique après succès ;
- l’absence de publication cloud en espace local ;
- le maintien d’un enregistrement cloud atomique en espace compte.

Cette évolution n’est pas encore présente dans `main` et n’est pas publiée en
production. La Preview validée était
`https://b2381e88.sportpilot-pages.pages.dev`.

## Planifié — suite UX et structure fonctionnelle

La prochaine évolution fonctionnelle n’est pas encore ordonnée dans une source
canonique. Le prochain cadrage doit choisir entre :

- un audit ciblé et une première PR sur `Planning hebdomadaire` ;
- un audit ciblé et une première PR sur `Objectifs` ;
- un audit transverse préalable de leur articulation et de la normalisation
  globale de SportPilot.

Le cadrage doit produire un rapport de décision et une roadmap de PR limitées.
Aucune branche, aucun commit et aucune PR fonctionnelle ne sont autorisés avant
validation explicite du choix et du périmètre.

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
