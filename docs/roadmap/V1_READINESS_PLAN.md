# Trajectoire de cohérence globale et readiness V1

Statut : **Phase 8 — stable `1.0.0` en préparation**. Les Phases 0 à 5 et les
lots de convergence sont terminés ; la Phase 6 conditionnelle n'a pas été
requise et la Phase 7 s'est achevée par l'acceptation de RC2. Ce document
n’autorise pas automatiquement les développements,
Previews, fusions, releases ou déploiements qu’il décrit.

## Objectif

Stabiliser le périmètre existant de SportPilot, démontrer sa cohérence globale
et préparer une publication `1.0.0`.

Le programme ne vise pas à « refaire toute l’application » dans une seule PR.
Il suit quatre principes :

1. auditer avant de modifier ;
2. créer seulement les fondations dont le besoin est démontré ;
3. migrer par lots indépendants et vérifiables ;
4. terminer par une readiness, une candidate et une publication autorisée.

## Définitions

**V1-ready** signifie que le périmètre existant est cohérent, compréhensible,
stable, sûr pour les données, mobile-first, utilisable hors ligne, testable et
publiable.

**V1 publiée** signifie qu’une candidate a été validée, fusionnée vers `main`,
taguée `v1.0.0`, publiée dans une release GitHub et déployée en production avec
les contrôles post-déploiement requis.

Une application V1 n’a pas besoin de contenir toutes les idées futures. Les
fonctions non essentielles ou non cadrées sont reportées au cycle post-V1.

## Sources de vérité

- dépôt : `Axelctrt/sport-nutrition-tracker` ;
- production fonctionnelle 0.37.0 :
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a` ;
- `develop` avant la Phase 0 :
  `eec97bf9ac776b519d051329551836853894fd82` ;
- `develop` après le Lot 8 et la preuve transverse finale :
  `3eff34a73cc40d98d3de2ab947ac8b45bfae5f01` ;
- audit parent : issue #63, clôturée en `completed` ;
- RC1 rejetée : issue #142 ;
- base RC2 après correctif PWA #145 :
  `develop@465f927c6ed17dd7537bfa83d6fe11e9329825ea` ;
- correctif navigation/focus #151/#152 :
  `develop@2d87ef9ddbf1d667c54229093b0895e948e6c73d` ;
- stabilisation de preuve WebKit Progress Photos #149/#150 et base technique
  avant gel RC2 :
  `develop@e1921f5807292f8236e70c1688d8d9f02c22bdf0` ;
- RC2 gelée et acceptée :
  `2554638a782f3be338b7323b95abc1078f65ef0b`, issue #147 ;
- gate CORS de la Preview RC2 : issue #146, fermée en `completed` ;
- gate sécurité stable : issue #141, fermée en `completed` après #161 ;
- suivi Quagga/Sharp post-V1 non bloquant : issue #162 ;
- `develop` au début de la préparation stable :
  `13cef273d09d78eeb4d177ab23e86c7770748419` ;
- stabilisations post-RC2 intégrées : Friends #153/#154, isolation Vitest
  #155/#156, thème WebKit #157/#158 et géométrie sociale #159/#160 ;
- préparation stable : issue #163 ;
- contrats :
  - [`../product/UX_GUIDELINES.md`](../product/UX_GUIDELINES.md) ;
  - [`../product/DESIGN_SYSTEM.md`](../product/DESIGN_SYSTEM.md) ;
  - [`../product/PRODUCT_RULES.md`](../product/PRODUCT_RULES.md) ;
  - [`../architecture/DATA_AND_SYNC.md`](../architecture/DATA_AND_SYNC.md) ;
  - [`../quality/TEST_STRATEGY.md`](../quality/TEST_STRATEGY.md) ;
  - [`../quality/RELEASE_PROCESS.md`](../quality/RELEASE_PROCESS.md).

La base exacte de chaque phase doit être revérifiée. RC1 reste historiquement
rejetée. RC2 reste l'archive acceptée au SHA `2554638a…`; la préparation stable
utilise le SHA `13cef273…` ci-dessus après revérification GitHub.

## Phase 0 — Réconciliation documentaire

### Résultat attendu

- remplacer la PR #60 devenue obsolète ;
- aligner les documents canoniques sur l’état réel ;
- consigner les PR #24, #45, #47, #49, #51, #53, #54, #56, #57, #59 et #62 ;
- clôturer administrativement le chantier parent #50 ;
- identifier l’issue #63 comme prochaine étape ;
- distinguer production 0.37.0 et évolutions seulement intégrées à `develop`.

### Hors périmètre

- code produit ;
- tests fonctionnels ;
- migration ;
- `main`, release et production.

## Phase 1 — Audit transverse en lecture seule

### Périmètre

#### Structure et hiérarchie

- objectif et action principale de chaque page ;
- titres, descriptions, densité et ordre des informations ;
- contenus longs et divulgation progressive.

#### Navigation

- routes rechargeables ;
- comportement Retour ;
- conservation du contexte ;
- destinations distinctes ;
- cohérence mobile et desktop.

#### Formulaires

- consultation et édition ;
- validation et focus sur erreur ;
- protection des changements non enregistrés ;
- sauvegarde, annulation et erreurs réseau ;
- conservation des brouillons et états occupés.

#### Feedback et états

- boutons, notices, toasts, bannières et confirmations ;
- chargement initial, rafraîchissement, sauvegarde et synchronisation ;
- premier usage, filtre vide, indisponibilité et succès ;
- absence de feedback concurrent ou silencieux.

#### Composants et comportements

- cartes, listes, menus et actions destructives ;
- Bottom Sheets, popovers et modales ;
- fermeture, focus, clavier et non-réentrance ;
- cohérence des libellés.

#### Accessibilité et appareils

- ARIA, contraste et ordre clavier ;
- texte agrandi et mouvement réduit ;
- 320, 360, 393 et 412 px ;
- WebKit/iPhone ;
- clair, sombre et thèmes existants ;
- clavier ouvert et safe areas.

#### Données et résilience

- local-first et hors ligne ;
- aucune perte de saisie ;
- reprise après fermeture, rechargement et mise à jour PWA ;
- isolation invité, profil local et compte ;
- synchronisation et conflits sans exposition croisée.

### Classification obligatoire

Chaque surface ou constat est classé comme :

- **défaut** : comportement incorrect ou incohérent ;
- **risque** : comportement acceptable mais fragile ;
- **dette** : duplication ou absence de primitive ;
- **recommandation UX** : changement produit soumis à validation ;
- **option** : plusieurs solutions acceptables ;
- **conforme** : aucune intervention nécessaire.

### Livrables

- inventaire des surfaces ;
- matrice de conformité ;
- cartographie des primitives et exceptions ;
- impacts et priorités ;
- fondations manquantes démontrées ;
- lots recommandés ;
- critères d’acceptation, hors périmètre et tests ;
- recommandations UX séparées.

### Condition de sortie

Le propriétaire valide le rapport, les priorités et le découpage. Aucun code
n’est modifié avant cette décision.

## Phase 2 — Fondations partagées manquantes

Cette phase est conditionnelle. Elle ne crée que les primitives dont le besoin
est démontré par plusieurs écarts.

Familles à évaluer :

- structure canonique de page ;
- surface d’édition protégée ;
- contrat de feedback ;
- contrat de chargement et d’indisponibilité ;
- présentation canonique de listes et cartes.

Chaque fondation utilise une PR distincte, des pilotes limités, une
compatibilité explicite et des tests proportionnés.

## Phase 3 — Normalisation par vagues

L’ordre définitif dépend de l’audit.

### Vague A — Shell global et navigation

- navigation mobile et desktop ;
- en-têtes et actions principales ;
- Retour, scroll, sticky actions et safe areas.

### Vague B — Compte, onboarding et synchronisation

- création et ouverture d’espace ;
- OTP et onboarding ;
- profil, social et confidentialité ;
- états Dexie Cloud, hors ligne et synchronisation.

Le protocole Dexie Cloud, l’identité et l’isolation des données restent
inchangés sauf décision d’architecture séparée.

### Vague C — Sport et Planning

- Planning sportif ;
- séances, modèles, exercices et activités ;
- assistant quotidien ;
- création, édition, confirmation et reprise.

Les calculs et le rapprochement prévu/réalisé restent inchangés.

### Vague D — Nutrition

- journal, aliments, recettes et favoris ;
- quantités, recherche, filtres et objectifs ;
- états vides, chargements et erreurs.

Aucune formule calorique ou valeur nutritionnelle n’est modifiée.

### Vague E — Objectifs et Progression

- objectifs, jalons et bilan hebdomadaire ;
- poids, pas, historiques et graphiques ;
- progression et actions contextuelles.

La métrique immuable et l’anti-double comptage restent des contraintes.

### Vague F — Photos et surfaces secondaires

- photos de progression ;
- profil, amis et confidentialité ;
- paramètres, archives, import et export.

Les photos restent locales, non sociales et non analysées par IA.

## Phase 4 — Convergence transverse

Réinventorier l’application après les migrations :

- composants locaux résiduels ;
- styles et palettes locales ;
- actions principales et destructives ;
- feedbacks concurrents ;
- formulaires non protégés ;
- overlays non conformes ;
- focus, scroll, responsive, thèmes et mouvement réduit ;
- hors ligne, continuité et isolation des données.

Une exception n’est conservée que si sa raison produit ou technique est
documentée.

## Phase 5 — Audit de readiness V1

### Barrières fonctionnelles

- parcours principaux complets ;
- aucune impasse critique ;
- erreurs et confirmations compréhensibles ;
- fonctions annoncées réellement disponibles.

### Barrières UX

- hiérarchie et actions cohérentes ;
- formulaires protégés ;
- feedback unique et actionnable ;
- responsive mobile et thèmes sans régression.

### Barrières données

- aucune perte de données connue ;
- isolation des espaces ;
- reprise et hors ligne ;
- synchronisation et migrations maîtrisées.

### Barrières techniques

- aucune anomalie bloquante ou critique ;
- CI complète verte ;
- Playwright, WebKit, PWA et stabilité verts ;
- mise à jour depuis la version publiée validée ;
- dette résiduelle classée.

### Barrières produit et documentation

- périmètre V1 déclaré ;
- fonctions futures séparées ;
- documentation et changelog cohérents ;
- recette propriétaire finale définie.

### Décision

- **V1 prête** ;
- **V1 prête sous corrections ciblées** ;
- **V1 non prête**, avec liste fermée des blocages.

## Phase 6 — Corrections bloquantes V1

Phase conditionnelle. Elle ne contient que les blocages démontrés par la
readiness. Aucun nouveau besoin, redesign ou élargissement fonctionnel.

## Phase 7 — Release Candidate V1

Statut : **terminée — RC2 acceptée dans #147**.

RC1 a été déployée une seule fois puis rejetée pour le cold launch PWA #144.
Le correctif PWA #145 et son E2E dédié, le correctif produit de préservation du
focus #151/#152 et la stabilisation de preuve WebKit Progress Photos #149/#150
sont intégrés dans la base RC2. RC2 a été gelée au SHA
`2554638a782f3be338b7323b95abc1078f65ef0b`, déployée une seule fois et
acceptée après recette propriétaire. #146 est terminée.

- gel fonctionnel ;
- version candidate ;
- notes et changelog ;
- Preview immuable uniquement après une autorisation explicite séparée ;
- tests de mise à jour et données ;
- recette mobile, desktop, WebKit et hors ligne ;
- vérification finale du diff.

## Phase 8 — Publication SportPilot V1

Statut courant : **candidat stable `1.0.0` en préparation sur
`codex/163-release-1-0-0` depuis
`develop@13cef273d09d78eeb4d177ab23e86c7770748419`**. #141 est terminée ; le
résiduel Quagga/Sharp accepté est suivi séparément dans #162.

Actions séparément autorisées :

- candidat stable et documentation ;
- Preview finale ;
- PR `develop` vers `main` ;
- fusion ;
- tag `v1.0.0` ;
- release GitHub ;
- déploiement de production ;
- contrôles post-déploiement ;
- procédure de repli.

## Phase 9 — Cycle produit post-V1

Seulement après publication et bilan de la V1 :

- nouvelles fonctionnalités ;
- simplification de parcours qui change le produit ;
- synchronisation étendue ;
- nouvelles métriques ;
- performance avancée ;
- accessibilité approfondie ;
- dette technique prioritaire ;
- renvoi OTP après audit du contrat Dexie Cloud ;
- extension IA ou sociale après validation dédiée.

## Reprise par une prochaine conversation ou un agent

1. vérifier l’état réel de `develop`, de l'issue stable #163 et de la PR draft ;
2. lire ce document, `ROADMAP.md`, `AGENTS.md`, les guides UX et design system ;
3. ne pas utiliser une ancienne conversation comme seule source ;
4. conserver la production `0.37.0` distincte de la candidate ;
5. vérifier tests, audits, versions de données et CI sur le HEAD exact ;
6. conserver #103, #136, #137, #138 et #162 hors du diff fonctionnel ;
7. conserver #141 et #146 comme gates terminés, sans les présenter comme
   blockers ouverts ;
8. attendre une validation explicite avant Preview, fusion ou publication.

## Garde-fous

- mobile-first ;
- local-first et hors ligne ;
- continuité et isolation des données ;
- aucune formule calorique sans validation ;
- aucun thème validé sans validation ;
- aucune extension IA sans validation ;
- recommandations UX séparées ;
- aucune fusion, release ou production sans autorisation explicite.
