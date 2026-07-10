# SportPilot 0.30.0 — U11 Hub Nutrition quotidien

## Objectif

Transformer le journal alimentaire existant en hub quotidien mobile-first sans modifier le moteur calorique, les formules de macros, les données persistées ni les routes historiques.

## Comportement livré

- action principale « Ajouter un aliment » visible dès le haut de page ;
- panneau inférieur de sélection du repas avant ouverture du sélecteur existant ;
- navigation directe vers le jour précédent, le jour suivant ou une date précise ;
- suppression des données transitoires de l’ancienne journée pendant un changement de date ;
- résumé calories consommées, restantes, objectif et progression des macros ;
- quatre cartes repas compactes : petit-déjeuner, déjeuner, dîner et collations ;
- une seule carte repas développée à la fois ;
- ouverture initiale du premier repas contenant des données, sinon du petit-déjeuner ;
- nombre d’aliments, calories et macros visibles lorsque la carte est repliée ;
- état vide global et états vides par repas avec action immédiate ;
- conservation des actions existantes : quantité, détails, duplication, suppression, photo, recette, favori et copie ;
- conservation de la mise en évidence après retour d’un ajout ;
- conservation des données visibles pendant une actualisation silencieuse.

## Hors périmètre

La refonte complète des méthodes d’ajout — recherche unifiée, scanner, photo, récents, favoris, aliments personnels, recettes et saisie manuelle — reste réservée à U12.

## Compatibilité

- aucune migration D1 ou Dexie ;
- aucune nouvelle donnée métier ;
- aucune modification du calcul des calories ou macros ;
- routes `/food`, `/food/select`, `/food/add`, scanner, photo et recettes conservées ;
- fonctionnement local et compte connecté inchangé ;
- synchronisation du journal inchangée.

## Validation attendue

- 320, 375, 390 et 430 px ;
- iPhone 15 sous iOS 26 ;
- desktop ;
- navigation entre dates ;
- journée vide et journée remplie ;
- un seul repas ouvert ;
- retour après ajout avec repas et entrée mis en évidence ;
- absence de scroll horizontal ;
- clavier et focus accessibles.
