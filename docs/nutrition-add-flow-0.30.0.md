# SportPilot 0.30.0 — U12 Ajout Nutrition et photo IA

## Objectif

Unifier les méthodes d’ajout d’un aliment autour du repas et de la date choisis, sans casser les routes historiques ni modifier les calculs nutritionnels.

## Parcours unifié

L’écran `Ajouter un aliment` propose désormais :

- recherche dans les aliments locaux ;
- Open Food Facts ;
- scanner de code-barres ;
- estimation par photo ;
- aliments récents ;
- aliments favoris ;
- bibliothèque `Mes aliments` ;
- recettes ;
- repas favoris ;
- création manuelle.

Chaque destination conserve la date, le repas et l’état de retour du journal.

## Recherche et provenance

La recherche locale :

- ignore les accents et la casse ;
- couvre le nom, la marque et le code-barres ;
- tolère une faute simple ou une inversion de deux lettres dans les mots longs.

Les cartes indiquent explicitement si la donnée vient de `Mes aliments` ou d’`Open Food Facts`.

## Photo et intelligence artificielle

L’autorisation IA est présentée dans une carte pleine largeur avec :

- une explication claire ;
- un interrupteur accessible ;
- l’état activé ou désactivé ;
- une aide contextuelle sur l’envoi de la photo.

L’autorisation est ponctuelle et vaut uniquement pour la photo sélectionnée. Sans activation, l’analyse reste locale. Après ajout, l’utilisateur revient au bon repas et l’entrée créée peut être mise en évidence.

## Recettes et repas favoris

Les liens vers les recettes et les repas favoris transportent le contexte du journal. Une recette revient déjà au journal via le flux existant. Un repas favori utilise désormais la date et le repas demandés et revient directement au journal lorsqu’il a été ouvert depuis ce parcours.

## Compatibilité

- aucune route existante supprimée ;
- aucune migration D1 ou Dexie ;
- aucune modification des calories ou des macros ;
- scanner, Open Food Facts, photo, recettes et ajout manuel réutilisent les services existants ;
- fonctionnement hors ligne conservé pour les aliments locaux.
