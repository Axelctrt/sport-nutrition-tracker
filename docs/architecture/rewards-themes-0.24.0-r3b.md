# SportPilot 0.24.0 R3b — Refonte artistique premium des thèmes

## Objectif

R3b corrige le retour esthétique de R3 : certains décors donnaient une impression trop simple et trop illustrative. Cette passe recentre les thèmes sur une direction plus mature : jeu vidéo, fantasy, sci-fi, cinématique et semi-réaliste.

## Décisions produit

- Les décors principaux doivent occuper toute la largeur de l’écran.
- Les miniatures de prévisualisation deviennent de vraies vitrines du thème.
- Les animations sont réservées à Nexus vivant, Volcan, Océan, Abysses et Cosmos.
- Si une animation dégrade le rendu, la qualité visuelle prime sur le mouvement.
- Canopée et Forge sont volontairement renforcés de manière plus statique.
- Aucun thème verrouillé n’est débloqué par cette phase.

## Priorités artistiques

1. Nexus vivant
2. Volcan
3. Cosmos
4. Océan
5. Abysses

## Contraintes techniques

- Pas d’asset image lourd.
- Décors réalisés avec CSS gradients et silhouettes intégrées.
- Respect de `prefers-reduced-motion`.
- Aucune migration de stockage.
- Version applicative conservée en `0.23.1` jusqu’à finalisation de la 0.24.0.
