# Onboarding compact — SportPilot 0.32.0

## Objectif

Le parcours doit être immédiatement lisible sur mobile, sans sacrifier la taille des contrôles ni les explications indispensables. Toutes les étapes ordinaires tiennent dans la hauteur dynamique d’un iPhone 15. Le résumé final constitue l’unique exception et fait défiler la page entière.

## Structure

1. choix Mode local ou Connecter un compte ;
2. connexion e-mail et code sur un écran distinct lorsque le compte est choisi ;
3. neuf étapes de profil : nom, sexe, date ou âge, taille, poids, objectif, activité, pas et résumé ;
4. actions Retour et Continuer ou Commencer conservées dans la zone utile.

## Rouleaux

`WheelPicker` utilise le défilement tactile natif, `scroll-snap`, une sélection centrale et des commandes clavier. La sensibilité par défaut est légèrement amplifiée à 1,15. Le rouleau de variation hebdomadaire passe explicitement `scrollSensitivity={1}` afin de conserver une sélection plus précise.

## Défilement

- étapes ordinaires : `html`, `body` et page verrouillés ;
- rouleaux : défilement interne autorisé ;
- résumé : le conteneur principal entier utilise `overflow-y: auto` ;
- aucune carte du résumé ne possède son propre scroll.

## Compatibilité

- aucune migration Dexie ou D1 ;
- aucun changement du schéma de sauvegarde ;
- valeurs du profil et calculs existants conservés ;
- reprise de brouillon et modification depuis le résumé conservées ;
- mode local associable ultérieurement à un compte.

## Validation

- tests unitaires des étapes, du résumé et des rouleaux ;
- `test:e2e:onboarding` sur WebKit iPhone 15 ;
- `test:e2e:acceptance` sur Chromium desktop et WebKit ;
- recette manuelle PWA avec VoiceOver, clavier, réduction des animations et barres Safari dynamiques.
