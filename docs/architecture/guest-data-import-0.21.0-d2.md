# Import des données invitées — SportPilot 0.21.0 D2

## Objectif

Fusionner un espace invité dans un espace de compte existant sans supprimer la source, sans doublons fonctionnels et sans mélange entre comptes.

## Séquence

1. lecture cohérente des deux bases Dexie ;
2. calcul d’une empreinte de la source et de la cible ;
3. construction d’un aperçu par domaine ;
4. confirmation explicite ;
5. revalidation des empreintes ;
6. remplacement atomique des tables utilisateur de la cible par le résultat fusionné ;
7. activation de l’espace du compte et rechargement.

## Résolution des collisions

- identifiant primaire pour les entités ordinaires ;
- date pour poids, pas et objectifs quotidiens ;
- date + créneau pour les repas ;
- semaine pour les bilans et missions ;
- date + type pour les rappels ;
- code-barres pour les produits alimentaires ;
- bilan parent pour les ajustements caloriques.

La valeur possédant le `updatedAt` le plus récent est retenue. En cas d’égalité, la donnée du compte est prioritaire. Les identifiants déjà présents dans le compte sont conservés et les références invitées sont remappées.

## Garanties

- aucune écriture dans la base invitée ;
- transaction unique côté compte ;
- annulation complète en cas d’erreur ;
- refus si la source ou la cible a changé après l’analyse ;
- application des marqueurs de suppression plus récents ;
- suppression des références orphelines avant écriture.
