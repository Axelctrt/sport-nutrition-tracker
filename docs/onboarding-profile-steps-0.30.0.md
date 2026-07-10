# SportPilot 0.30.0 — U5 : étapes personnelles de l’onboarding

## Objectif

U5 remplace le formulaire de profil monolithique de l’onboarding par une question principale par écran, sans modifier le modèle métier ni le moteur calorique.

Le parcours comprend désormais :

1. nom utilisé dans SportPilot ;
2. sexe utilisé pour l’équation énergétique ;
3. date de naissance ou âge actuel ;
4. taille ;
5. poids initial ;
6. objectif et variation hebdomadaire ;
7. activité professionnelle ;
8. objectif quotidien de pas.

Le choix local/compte de U3 et l’identité sociale obligatoire de U4 restent inchangés.

## Expérience mobile

- progression visible sur chaque écran ;
- barre Retour/Suivant persistante au-dessus de la zone sûre ;
- une question principale par écran ;
- grandes cartes tactiles pour le sexe, l’objectif et l’activité ;
- sélecteurs et saisie directe pour la date, la taille et le poids ;
- valeurs rapides et saisie précise pour les pas ;
- gestion des claviers numériques et décimaux ;
- recentrage automatique du premier champ invalide ;
- respect de la réduction des animations via le socle U2.

## Validation et reprise

Chaque écran valide uniquement ses propres données avant d’autoriser la suite. La validation finale réutilise le schéma Zod complet du profil.

Le brouillon enregistre désormais :

- toutes les valeurs du profil ;
- l’étape personnelle courante ;
- l’espace de données actif.

Les anciens brouillons U2 à U4 enregistrés sur l’étape `profile` reprennent automatiquement sur l’écran du nom. Les brouillons restent isolés entre le mode invité et chaque compte.

## Règles métier conservées

U5 réutilise sans modification :

- les bornes d’âge, taille, poids, variation et pas ;
- les objectifs perte, maintien et prise ;
- les suggestions existantes de variation hebdomadaire ;
- les niveaux d’activité professionnelle ;
- les coefficients de protéines et de lipides déjà présents dans les valeurs par défaut ;
- le schéma `UserProfile` ;
- la conversion du formulaire vers l’entité profil.

Les champs avancés de macronutriments restent modifiables depuis la page Profil. Ils ne sont plus demandés pendant l’onboarding, conformément au parcours validé.

## Limites reportées à U6

U6 ajoutera :

- le récapitulatif final ;
- la correction directe de chaque section depuis le récapitulatif ;
- la compatibilité finale des profils incomplets et restaurés ;
- la création et la présentation explicites de la première pesée ;
- le bouton final « Commencer avec SportPilot ».

## Compatibilité et migrations

- aucune migration Dexie ;
- aucune migration D1 ;
- aucune modification de version ;
- aucune route supprimée ;
- aucune formule calorique modifiée ;
- aucune valeur de coefficient modifiée ;
- mode local et comptes conservés.
