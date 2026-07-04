# SportPilot 0.24.0 R3c — Fonds cinématiques image-backed

## Objectif

Cette itération corrige la direction artistique R3/R3b : les décors CSS trop simples sont remplacés par des scènes cinématiques plein écran, inspirées des références visuelles validées pendant la recette.

La priorité est l’impact visuel : les thèmes avancés doivent ressembler à des fonds de jeu vidéo / fantasy / sci-fi, pas à de simples motifs décoratifs.

## Principes retenus

- fonds WebP locaux dans `public/theme-scenes/` ;
- affichage bord à bord via `background-size: cover` ;
- overlays UI pour préserver la lisibilité ;
- miniatures de thèmes basées sur les mêmes scènes ;
- animations uniquement sur Océan, Abysses, Volcan, Cosmos et Nexus vivant ;
- Canopée reste statique pour préserver la qualité de l’image ;
- aucun changement de règle de déblocage ;
- aucune migration de stockage ;
- version applicative conservée à `0.23.1` jusqu’à finalisation de la 0.24.0.

## Assets ajoutés

- `public/theme-scenes/ocean-cinematic.webp`
- `public/theme-scenes/abysses-cinematic.webp`
- `public/theme-scenes/volcan-cinematic.webp`
- `public/theme-scenes/canopee-cinematic.webp`
- `public/theme-scenes/cosmos-cinematic.webp`
- `public/theme-scenes/nexus-cinematic.webp`

## Thèmes concernés

### Océan

Scène sous-marine lumineuse, bulles, faune discrète, profondeur visuelle.

### Abysses

Scène abyssale sombre, reliefs, coraux, fumée sous-marine, ambiance semi-réaliste.

### Volcan

Volcan en éruption, lave crédible, fumée massive, braises et relief noir.

### Canopée

Jungle cinématique dense, lianes, végétation, perspective et lumière filtrée.

### Cosmos

Galaxie grandiose, densité d’étoiles, profondeur sci-fi et rendu plein écran.

### Nexus vivant

Thème ultime : base cosmique enrichie, énergie mythique et animation légère de halo.

## Contrôles

- `npm run audit:reward-theme-catalog`
- tests readiness R3c ;
- build ;
- audit production ;
- recette visuelle desktop + iPhone.
