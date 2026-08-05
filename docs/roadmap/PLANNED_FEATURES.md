# Fonctionnalités et chantiers planifiés

Ce document distingue explicitement les fonctionnalités publiées, les lots
déjà intégrés à `develop`, les travaux en validation et les chantiers seulement
autorisés pour la suite.

## Sources de vérité

- dépôt : `Axelctrt/sport-nutrition-tracker` ;
- état consolidé inspecté :
  `develop@e4ff9e1079dda8d48b1289c0905ddbcd6033ac0c` ;
- version publiée : SportPilot 0.37.0 au commit
  `84fea3d49e68c7d190c00d505502a5c4aa2e672a` ;
- séquence active : issue #50.

## Publié — SportPilot 0.37.0

La version publiée comprend notamment :

- les fondations UX partagées ;
- les variantes sémantiques de `EmptyState` ;
- la politique cohérente de feedback asynchrone ;
- l’arbitre unique des bannières globales ;
- la primitive `ExpandableCard` pilote ;
- les photos de progression privées et locales ;
- la continuité PWA et l’isolation des données associées.

La publication a été réalisée par la PR #21. Le tag annoté `v0.37.0` et la
release GitHub stable référencent le commit publié. Aucune migration D1 n’a été
exécutée.

## Intégré à `develop`, non publié

### Profil, Amis et Confidentialité — PR #24

- consultation initiale en lecture seule ;
- édition dans une surface dédiée ;
- protection des modifications non enregistrées ;
- feedback temporaire après succès ;
- comportement local et cloud existant conservé.

### Planning sportif — PR #45

- semaine et résumé rendus prioritaires ;
- création dans une surface dédiée ;
- navigation et destinations clarifiées ;
- route historique et rapprochement prévu/réalisé conservés.

### Objectifs de progression — PR #47

- création et édition sécurisées ;
- métrique verrouillée après création ;
- agrégation des minutes de musculation sans double comptage ;
- autres calculs, jalons et statuts conservés.

### Liaison Objectif → Action — PR #49

- liens contextuels vers les surfaces pertinentes ;
- aucune création automatique de séance, programme ou objectif ;
- aucune recommandation générative ajoutée.

## Chantier `ActionMenu` — issue #50

### Terminé et intégré — primitive canonique, PR #51

- API commune pour les lignes, liens, groupes et séparateurs ;
- Bottom Sheet sous 640 px ;
- popover ancré à partir de 640 px ;
- clavier, focus, fermeture et mouvement réduit pris en charge ;
- aucun changement métier.

### Terminé et intégré — domaine Sport, PR #53 et #54

Les séances modèles, la bibliothèque d’exercices, le journal d’activités et les
actions Sport de l’assistant quotidien utilisent les primitives canoniques.
L’issue #52 est clôturée.

### Terminé et intégré — domaine Nutrition, PR #56 et #57

Les cartes Aliment, Recette, Repas favori et Journal alimentaire utilisent les
primitives canoniques. L’issue #55 est clôturée.

### En validation, non intégré — Progression, issue #58 et PR #59

Le périmètre autorisé est strictement limité à :

- migrer le menu de `WeightHistoryEntryCard` vers `ActionMenuItem` ;
- conserver l’ordre `Modifier`, puis `Supprimer` ;
- insérer `ActionMenuSeparator` avant l’action destructive ;
- conserver le ton destructif, le libellé `Suppression…`, les callbacks et les
  états disabled/loading ;
- réinventorier les usages métier de `ActionMenu` afin de confirmer l’absence
  de boutons locaux `ghost` ou `dangerGhost` directement dans les menus.

Critères de sortie :

- sémantique `menuitem` ;
- séparateur immédiatement avant l’action destructive ;
- fermeture du menu après activation ;
- suppression non réentrante ;
- aucun débordement à 320, 360, 393 et 412 px ;
- tests ciblés, build, audits, PWA et Playwright verts ;
- recette Preview consignée ;
- validation explicite du propriétaire avant toute fusion.

Hors périmètre : calculs et données de poids, photos de progression, formules
caloriques, thèmes, IA, Dexie, Dexie Cloud, D1, migrations, `main`, release et
production.

## Autorisé après Progression — saisie OTP fluide

Ce lot constitue la PR 5 de l’issue #50. Il devra partir du `develop` réellement
intégré après validation du lot Progression et rester dans une branche dédiée.

### Résultat attendu

- composant `OtpCodeInput` ;
- une seule valeur logique ;
- six cellules visuelles ;
- code alphanumérique ;
- saisie clavier continue ;
- collage d’un code complet ;
- `autocomplete="one-time-code"` ;
- bouton de validation et protocole Dexie Cloud existants conservés.

### Critères d’acceptation attendus

- focus et sélection accessibles ;
- correction, suppression et collage fiables ;
- autofill compatible lorsque le navigateur le fournit ;
- aucun débordement aux largeurs mobiles de référence ;
- fonctionnement local-first et hors ligne inchangé ;
- tests unitaires ciblés, build et E2E pertinents verts.

### Hors périmètre

- renvoi de code ;
- modification du protocole d’identité ou de synchronisation ;
- migration de données ou D1 ;
- modification des thèmes, formules caloriques ou capacités IA ;
- fusion, release ou production sans autorisation explicite.

## Optionnel et conditionnel — renvoi OTP

Le renvoi OTP ne pourra être cadré qu’après vérification et validation du
contrat Dexie Cloud. Son inscription comme option dans l’issue #50 ne constitue
pas une autorisation de développement.

## Garde-fous permanents

- mobile-first ;
- local-first et hors ligne ;
- continuité et isolation des données ;
- aucune modification des formules caloriques sans validation ;
- aucune modification des thèmes validés sans validation ;
- aucune extension de l’IA sans validation ;
- aucune fusion, release ou production sans autorisation explicite.
