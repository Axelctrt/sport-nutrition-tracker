# Fonctionnalités et chantiers planifiés

Ce document distingue l’état publié, l’état intégré à `develop`, la trajectoire
V1 autorisée et les options post-V1. Une mention ici ne vaut jamais autorisation
de développement, fusion ou déploiement.

Statut courant : les Phases 0 à 5 et les lots de convergence sont terminés,
la Phase 6 conditionnelle n'a pas été requise et la Phase 7 est terminée. RC1
a été rejetée dans #142 ; RC2 a été gelée au SHA
`2554638a782f3be338b7323b95abc1078f65ef0b`, déployée une seule fois et
acceptée dans #147. #146 et #141 sont terminées ; #162 suit le résiduel
Quagga/Sharp accepté. La Phase 8 prépare `1.0.0` depuis
`develop@13cef273d09d78eeb4d177ab23e86c7770748419` via #163.

## Publié — SportPilot 0.37.0

La production fonctionnelle repose sur
`84fea3d49e68c7d190c00d505502a5c4aa2e672a`.

Le périmètre publié comprend notamment :

- les fondations UX partagées des Phases 3A à 3E ;
- les photos de progression privées et locales ;
- la galerie, le comparateur et l’archive photo séparée ;
- Dexie v12 additive et sauvegarde JSON v10 ;
- la PWA, le fonctionnement hors ligne et la continuité des données ;
- aucune migration D1.

## Intégré à `develop`, non publié

### Profil, Amis et Confidentialité — PR #24

- lecture seule prioritaire ;
- édition dans une surface dédiée ;
- confirmation d’abandon ;
- statut de l’identifiant public sous son champ ;
- succès temporaire unique ;
- isolation locale et comportement cloud atomique conservés.

### Planning sportif — PR #45

- semaine prioritaire ;
- action principale `Planifier` ;
- création musculation ou endurance dans une surface dédiée ;
- route historique conservée ;
- rapprochement prévu/réalisé inchangé.

### Objectifs de progression — PR #47

- création et édition protégées ;
- métrique verrouillée après création ;
- minutes de musculation agrégées sans double comptage ;
- autres métriques, jalons et statuts conservés.

### Objectif vers action — PR #49

- destination déterministe par métrique ;
- aucune création automatique ;
- aucune recommandation générative ;
- routes et persistance existantes conservées.

### Menus d’actions — PR #51, #53, #54, #56, #57 et #59

- Bottom Sheet mobile et popover tablette/desktop ;
- lignes, liens, groupes et séparateurs canoniques ;
- navigation clavier et focus ;
- migrations Sport, Nutrition, assistant quotidien et historique du poids ;
- actions destructives séparées ;
- comportements métier conservés.

### OTP fluide — PR #62

- une seule entrée native partagée ;
- huit cellules visuelles adaptatives ;
- saisie, sélection, copie, collage et correction natifs ;
- `autocomplete="one-time-code"` ;
- vérification automatique au huitième caractère ;
- prévention de la resoumission en boucle ;
- protocole Dexie Cloud inchangé.

## Trajectoire autorisée vers la V1

### Phase 0 — Réconciliation documentaire

- remplacer la PR #60 devenue obsolète ;
- aligner les documents canoniques sur le HEAD réel de `develop` ;
- consigner la fin du chantier #50 ;
- créer la référence détaillée de readiness V1 ;
- ne modifier aucun code produit.

### Phase 1 — Audit transverse en lecture seule

Issue parent : #63.

L’audit couvre :

- structure et hiérarchie des pages ;
- navigation et conservation du contexte ;
- formulaires et protection des modifications ;
- feedback, chargements, erreurs et confirmations ;
- états vides et indisponibilités ;
- cartes, listes, menus et overlays ;
- accessibilité, clavier et mouvement réduit ;
- largeurs mobiles, WebKit et thèmes existants ;
- fonctionnement hors ligne ;
- continuité et isolation des données.

Chaque constat doit être classé comme défaut, risque, dette, recommandation UX,
option ou conforme.

### Phase 2 — Fondations partagées manquantes

Uniquement si l’audit démontre leur nécessité. Exemples à évaluer, pas à
implémenter implicitement :

- structure canonique de page ;
- surface d’édition protégée ;
- contrats de feedback et de chargement ;
- présentations canoniques de listes et cartes.

### Phase 3 — Normalisation par domaines

Découpage indicatif à confirmer après l’audit :

1. shell global et navigation ;
2. compte, onboarding et synchronisation ;
3. Sport et Planning ;
4. Nutrition ;
5. Objectifs et Progression ;
6. photos, profil, paramètres et surfaces secondaires.

Chaque vague utilise des PR indépendantes, avec critères d’acceptation, hors
périmètre, tests et recette propriétaire.

### Phase 4 — Convergence transverse

- réinventaire de toute l’application ;
- exceptions locales justifiées ou supprimées ;
- contrôle des styles, feedbacks, formulaires, overlays et actions ;
- validation mobile, WebKit, hors ligne, thèmes et données.

### Phase 5 — Audit de readiness V1

Décider :

- V1 prête ;
- V1 prête sous corrections ciblées ;
- V1 non prête avec liste fermée des blocages.

### Phase 6 — Corrections bloquantes V1

Phase conditionnelle limitée aux blocages démontrés. Aucun élargissement
fonctionnel.

### Phase 7 — Release Candidate V1

Statut : **terminée**, RC2 acceptée dans #147.

- gel fonctionnel ;
- version candidate ;
- Preview immuable uniquement après autorisation explicite séparée ;
- migration et mise à jour depuis la version publiée ;
- recette propriétaire complète.

### Phase 8 — Publication SportPilot V1

Statut : **en cours**, limitée à la préparation du candidat stable tant que les
autorisations suivantes ne sont pas accordées.

- PR `develop` vers `main` ;
- version `1.0.0` ;
- tag et release GitHub ;
- production ;
- contrôles post-déploiement et stratégie de repli.

Toutes ces opérations exigent des autorisations séparées.

## Post-V1 uniquement

À recadrer après publication de la V1 :

- nouvelles fonctionnalités ;
- simplification de parcours qui change le produit ;
- synchronisation étendue ;
- nouvelles métriques ;
- performance avancée ;
- accessibilité approfondie ;
- dette technique prioritaire ;
- renvoi OTP, après audit du contrat Dexie Cloud ;
- toute extension IA ou sociale.

## Hors périmètre permanent sans nouvelle décision

- modification des formules caloriques ;
- stockage cloud ou publication sociale des photos de progression ;
- analyse corporelle automatique ou IA des photos de progression ;
- changement de fournisseur d’identité ou de synchronisation ;
- migration D1 implicite ;
- changement global des thèmes validés.
