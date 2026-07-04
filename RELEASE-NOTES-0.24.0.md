# Notes de version — SportPilot 0.24.0

## Récompenses 2.0

SportPilot enrichit le centre de récompenses avec un catalogue de 50 badges couvrant la course, la musculation, la natation, les pas, la régularité, la polyvalence et la nutrition. Les badges historiques conservent leurs identifiants afin de ne pas perdre les récompenses déjà acquises.

Les progressions affichées sont arrondies proprement afin d’éviter les artefacts de précision flottante, notamment sur les distances comme le semi-marathon.

## Thèmes 2.0

Le catalogue contient désormais 15 thèmes. Les thèmes restent visibles même lorsqu’ils sont verrouillés, mais seuls les thèmes réellement débloqués peuvent être appliqués durablement.

L’aperçu rapide se fait uniquement via l’icône œil : une mini pop-up fixe et centrée donne une idée du rendu sans appliquer le thème à toute l’application.

## Style complet ou minimaliste

Un réglage global permet de choisir le style d’application du thème :

- **Complet** applique l’identité visuelle à toute l’interface ;
- **Minimaliste** conserve une interface neutre et limite le thème aux accents, icônes et barres de progression.

SportPilot classique reste réservé au mode minimaliste, car il ne personnalise pas le fond de l’application.

## Mode sombre et accessibilité

Le rendu sombre des thèmes accessibles est stabilisé afin d’éviter les mélanges entre surfaces claires et sombres. Aucun thème n’est animé dans cette version.

La recette inclut les contrôles sur ordinateur et iPhone 15 sous iOS 26.

## Objectifs et affichages numériques

Les objectifs et progressions en kilomètres sont arrondis à une décimale lorsque nécessaire. Les valeurs du type `0.10000000000000142` ne doivent plus apparaître dans les textes utilisateur.

## Compatibilité

- runtime Dexie Cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

**Aucune migration** de données, de sauvegarde ou de registre n’est requise.
