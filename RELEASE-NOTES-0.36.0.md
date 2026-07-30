# SportPilot 0.36.0 - Amis, Paramètres et saisie Musculation

Branche : `feat/friends-settings-strength-ux-0.36.0`

Dépendance : commit validé 0.35.1 `d067cb2fd718e0cd71d597398e6e1d3f57f3e973`.

## Amis

- remplace la navigation par défilement et le `MutationObserver` par quatre rubriques explicites ;
- conserve la rubrique dans `?section=feed|friends|requests|profile` ;
- affiche une seule rubrique à la fois et signale les demandes reçues ;
- place les permissions détaillées dans une feuille de gestion ;
- réserve le diagnostic social aux réglages avancés ;
- prépare le fil cloud uniquement à l’ouverture du Fil ;
- retire les références aux snapshots, migrations D1, contrats et identifiants internes du parcours ordinaire.

Le périmètre social reste inchangé : aucun annuaire public, likes, commentaires, messagerie ou export d’activité brute n’est ajouté.

## Paramètres

- consolide l’accueil en cinq catégories ;
- retire les métriques techniques de l’accueil ;
- regroupe confidentialité, amis, autorisations et données ;
- retire d’Avancé les réglages courants et les composants de récompenses dupliqués ;
- conserve les coefficients, calibrations, diagnostics, synchronisation et outils de données dans Avancé ;
- maintient les anciennes routes et les liens profonds.

## Musculation

- ouvre un seul exercice à la fois et permet de tous les replier ;
- rouvre l’exercice courant avec `Continuer` ;
- remplace l’action Enregistrer par une validation unique et une autosauvegarde fiable ;
- sauvegarde après un court délai, au blur et avant démontage ;
- conserve les valeurs et propose de réessayer en cas d’échec ;
- place le RPE et les options secondaires dans un panneau discret ;
- préremplit depuis la série précédente, sinon la performance historique, sinon l’objectif prévu.

## Données et compatibilité

- aucune migration Dexie ou D1 ;
- AppDatabase Dexie v11 conservée ;
- sauvegarde JSON v10 conservée ;
- runtime cloud v16 conservé ;
- contrats sociaux `0.29.0-a3` conservés ;
- aucune modification des formules caloriques.

## Publication

Aucun tag ni déploiement n’est réalisé. La branche peut être poussée et proposée dans une pull request brouillon après validation complète.
