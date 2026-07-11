# U15 — Recette mobile, accessibilité et non-régression

## Objectif

U15 clôt la refonte UX 0.30.0 avec un socle de validation réutilisable sur les quatre rubriques principales : Accueil, Nutrition, Sport et Progression.

## Contrôles automatisés

La recette Playwright vérifie :

- l’absence de débordement horizontal critique ;
- la présence d’un unique contenu principal ;
- un titre de niveau 1 sur chaque hub ;
- l’absence d’identifiants HTML dupliqués ;
- un nom accessible pour les boutons et liens visibles ;
- un libellé accessible pour les champs visibles ;
- des cibles tactiles de 44 px minimum dans l’en-tête et la navigation basse ;
- le lien d’évitement clavier ;
- le piégeage et la restitution du focus dans les panneaux ;
- le respect de `prefers-reduced-motion`.

Le script `npm run audit:ux-mobile-acceptance` vérifie en complément les garde-fous statiques nécessaires à ces parcours.

## Correctifs inclus

- Les actions mobiles de l’en-tête utilisent désormais la variable commune `--sp-touch-target`, soit 44 px.
- `ConfirmationDialog` génère des identifiants ARIA uniques avec `useId` et expose `aria-busy` pendant une opération en cours.
- Les scénarios historiques de navigation attendent désormais le titre réel « Sport ».

## Hors périmètre

- Aucun calcul calorique ou macro n’est modifié.
- Aucun schéma D1 ou Dexie n’est modifié.
- Aucun parcours métier n’est réécrit.
- L’audit automatisé ne remplace pas la recette VoiceOver sur appareil réel.
