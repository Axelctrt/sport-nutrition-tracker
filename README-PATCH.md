# SportPilot 0.23.1 — confirmations d’action globales

Branche de publication : `feature/global-action-feedback-0.23.1`

## Livraison

La version 0.23.1 :

- centralise les confirmations de succès et les erreurs ;
- déduplique les notifications répétées ;
- conserve une confirmation après un rechargement complet ;
- couvre les principaux écrans de création, modification, suppression, restauration et export ;
- maintient un indicateur discret pour les autosauvegardes et écritures fréquentes ;
- ajoute un audit transversal au pipeline complet.

## Correctif complémentaire Objectifs

La même livraison 0.23.1 corrige aussi l’éditeur d’objectifs :

- les données existantes sont réaffichées fidèlement lors d’une modification ;
- un nouvel objectif de poids propose la dernière pesée comme poids de départ ;
- un objectif de poids existant conserve son poids de départ historique et ne le recalcule jamais depuis la dernière pesée actuelle.

## Versions

- application : `0.23.1` ;
- runtime Dexie Cloud : v10 ;
- base métier Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre des espaces : v1.

Aucune migration n’est introduite.

## Vérification

```powershell
npm ci
npm run audit:action-feedback
npm run release:verify
git diff --check
```

La publication doit être validée sur ordinateur et iPhone 15 sous iOS 26 avant la fusion manuelle dans `main` et la création du tag `v0.23.1`.


---

# SportPilot 0.24.0 R1 — récompenses et thèmes 2.0

Cette phase de développement prépare la prochaine version majeure sans changer encore la version affichée `0.23.1`.

Elle ajoute :

- un catalogue de cinquante badges ;
- quinze thèmes visuels au total ;
- onze nouveaux thèmes, dont cinq accessibles, cinq avancés et un légendaire dynamique ;
- un mode aperçu permettant de tester tous les thèmes, même verrouillés ;
- un audit dédié `audit:reward-theme-catalog`.

Les règles définitives de déblocage des thèmes pourront être ajustées après validation esthétique sur ordinateur et iPhone.


## SportPilot 0.24.0 R3 — Thèmes spectaculaires

Cette phase renforce la direction artistique des thèmes : Volcan affiche lave, fumée, cendres et braises ; Océan et Abysses affichent bulles, poissons et silhouettes marines ; Canopée affiche feuilles et lianes ; Cosmos affiche nébuleuses, planètes et orbites ; Forge affiche acier, feu et étincelles ; Nexus vivant devient le thème légendaire multicouche avec énergie animée. Les règles de déblocage définitives ne sont pas encore activées et l’aperçu ne débloque toujours rien durablement.
