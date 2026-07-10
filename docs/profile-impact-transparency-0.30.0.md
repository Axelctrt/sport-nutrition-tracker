# U8 — Prévisualisation et journal des impacts du profil

## Objectif

Empêcher l’enregistrement à l’aveugle d’une modification susceptible d’affecter les objectifs énergétiques ou nutritionnels, sans réécrire les journées passées.

## Fonctionnement

Lorsqu’un champ important du profil change, SportPilot calcule deux scénarios pour la journée courante avec les mêmes données d’activité, de pas, de planification, de réglages et de poids de référence :

- avant la modification ;
- après la modification proposée.

L’utilisateur voit les calories et les trois macronutriments avant de confirmer. Une modification du prénom uniquement reste immédiate.

## Champs suivis

- sexe utilisé par l’équation énergétique ;
- âge ou date de naissance ;
- taille ;
- poids initial historique ;
- objectif ;
- variation hebdomadaire ;
- activité professionnelle ;
- objectif de pas ;
- coefficients de protéines et de lipides.

Le poids actuel continue de provenir de la dernière pesée. Une modification du poids initial peut donc ne produire aucun changement aujourd’hui lorsqu’une pesée de référence est déjà disponible ; l’aperçu le montre explicitement.

## Validation et temporalité

Après confirmation :

1. le profil est enregistré ;
2. la cible de la journée courante est recalculée ;
3. une entrée explicative est ajoutée au profil.

Les journées passées ne sont pas recalculées. Le journal conserve au maximum douze entrées, les plus récentes en premier.

## Synchronisation et sauvegarde

Le journal est un champ optionnel du profil utilisateur :

- il est synchronisé par le domaine existant `account-preferences` ;
- il est exporté et restauré par les sauvegardes ;
- aucun nouveau store Dexie, aucune table D1 et aucune migration ne sont nécessaires ;
- les anciens profils sans journal restent valides.

## Périmètre déjà couvert ailleurs

- l’association de données locales à un compte dispose déjà de son analyse de convergence dans le parcours compte/espace de données ;
- l’import de sauvegarde possède déjà un aperçu avant restauration.

U8 ne duplique pas ces écrans et concentre la nouvelle implémentation sur les changements du profil et de ses objectifs.

## Risques contrôlés

- pas de sauvegarde avant confirmation ;
- journal borné à douze entrées ;
- données de calcul identiques pour les scénarios avant/après ;
- conservation du poids initial historique ;
- absence de réécriture silencieuse de l’historique ;
- restauration compatible avec les profils antérieurs.
