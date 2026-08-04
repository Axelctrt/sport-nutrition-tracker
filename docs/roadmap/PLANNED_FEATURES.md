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

## Terminé — audit transverse Planning, Objectifs et Progression

L’audit en lecture seule de `develop@417d1fc8e18239adbf511ba9d0571b91e1a8b606`
a été accepté le 4 août 2026.

Décisions produit :

- Planning et Objectifs restent séparés ;
- Progression et Bilan hebdomadaire servent de pont ;
- la métrique d’un objectif devient immuable après sa création ;
- changer de métrique impose de créer un nouvel objectif ;
- l’objectif de minutes d’activité couvre aussi les séances détaillées de
  musculation terminées ;
- une séance liée à une activité générale par `completedActivityId` ne doit être
  comptée qu’une seule fois ;
- aucun rapprochement approximatif par date, titre ou durée n’est autorisé.

Le rapport de décision détaillé est
[`PLANNING_GOALS_AUDIT_DECISIONS.md`](PLANNING_GOALS_AUDIT_DECISIONS.md).

## Cadrée — PR A : restructurer le Planning sportif

### Résultat attendu

- la semaine et son résumé deviennent le contenu prioritaire ;
- une action principale `Planifier` ouvre une surface dédiée ;
- l’utilisateur choisit ensuite `Musculation` ou `Endurance` ;
- `Répéter cette semaine` devient une action secondaire ;
- `Planifier` et `Voir les activités à venir` ont des destinations distinctes ;
- le titre visible et les métadonnées deviennent `Planning sportif` ;
- la route historique `/strength/planning` reste inchangée pour compatibilité.

### Contraintes

- aucun changement de schéma ou de persistance ;
- aucun changement de formule calorique ;
- aucun changement du rapprochement prévu/réalisé ;
- aucune modification des thèmes validés ;
- aucune extension IA ;
- fonctionnement local-first, hors ligne et mobile-first conservé.

### Tests attendus

- tests unitaires ciblés des destinations et états de la surface ;
- E2E de création musculation et endurance ;
- E2E de consultation de la semaine ;
- Chromium mobile et WebKit iPhone 15 ;
- absence de débordement horizontal ;
- une seule CI complète une fois le périmètre stabilisé avant fusion.

Le développement de cette PR reste soumis à une autorisation explicite.

## Planifiée après PR A — PR B : sécuriser les Objectifs de progression

### Résultat attendu

- création et édition dans une surface dédiée ;
- protection des modifications non enregistrées ;
- métrique non modifiable après création ;
- titre, cible, date de départ et échéance toujours modifiables ;
- agrégation des minutes d’activité corrigée sans double comptage ;
- distinction plus claire entre objectif nutritionnel et objectif de
  progression ;
- autres calculs, jalons et statuts inchangés.

### Règle anti-double comptage

- les activités générales sont comptées normalement ;
- une séance détaillée terminée est ajoutée seulement lorsque son
  `completedActivityId` ne référence aucune activité déjà comptée ;
- en l’absence d’activité liée, seule sa `durationMinutes` positive est ajoutée ;
- une activité générale de musculation non liée reste comptée ;
- aucune correspondance approximative n’est créée.

### Tests attendus

- unité : activité générale seule ;
- unité : séance détaillée seule ;
- unité : séance et activité liées, comptées une seule fois ;
- unité : activité de musculation non liée ;
- composant : métrique verrouillée en modification ;
- composant : abandon des changements ;
- responsive et WebKit ciblés ;
- une seule CI complète une fois avant fusion.

## Optionnelle — PR C : relier un objectif à une action

Cette PR pourra proposer des liens contextuels vers Planning ou un écran de
saisie pertinent. Elle ne doit créer automatiquement aucune séance, aucun
programme, aucune cible et aucune recommandation générative. Elle nécessite une
nouvelle validation produit après retour d’usage des PR A et B.

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
