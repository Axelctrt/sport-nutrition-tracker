# Règles produit

Statut : **décisions validées**, sauf mention contraire.

## Principes

1. SportPilot est mobile-first, local-first et utilisable hors ligne.
2. Une action importante confirme sa réussite ou explique son échec.
3. La saisie fréquente reste rapide : sauvegarde automatique non intrusive,
   valeurs intermédiaires préservées et validation explicite au bon moment.
4. Les données appartiennent à un espace identifié. Aucun mélange implicite
   entre invité, profil local et compte cloud.
5. Une mise à jour ne doit pas supprimer ni rendre illisibles les données
   historiques.
6. Les textes utilisateur décrivent une action ou un résultat, pas les noms de
   tables, contrats, snapshots ou diagnostics internes.

## Nutrition et calories

- Les formules, coefficients, poids de référence, arrondis et versions de
  calcul sont des contrats métier.
- Toute modification exige un audit dédié, des cas de référence, une migration
  ou compatibilité documentée et une validation explicite.
- Un changement purement visuel ne doit pas recalculer l’historique.

## Signaux quotidiens Coach

- Une absence de réponse au check-in ou au check-out reste une absence de
  signal ; aucune valeur neutre n’est persistée par défaut.
- Un poids de référence ou fallback ne devient une pesée canonique qu’après
  activation explicite de la saisie de pesée par l’utilisateur.
- Les valeurs réellement enregistrées restent restaurées lors de l’édition.
- Les données historiques ambiguës ne sont ni réécrites ni nettoyées
  automatiquement ; l’absence de provenance reste `legacyUnknown` pour le
  contrat Coach.
- Une nouvelle pesée saisie dans Progression ou confirmée au check-in porte la
  provenance `userMeasurement`. La pesée créée par l’initialisation du profil
  porte `profileInitialization` et ne vaut pas mesure utilisateur.
- Les signaux subjectifs sommeil, état de forme, faim et énergie portent
  `userReported` uniquement après interaction ou confirmation explicite. Une
  simple ouverture, restauration ou sauvegarde d’un formulaire historique ne
  les requalifie pas.
- Le contrat de preuve Coach expose une valeur, une date, une provenance et un
  niveau de confiance. Les moyennes dérivées sont `derived`, les valeurs de
  profil utilisées en repli sont `profileFallback`, et aucune absence de signal
  n’est transformée en observation. Cette confiance qualifie une preuve
  individuelle ; elle ne constitue pas la confiance globale du futur Coach C1.

## Coach State

- Le Coach State n’utilise comme signaux fiables que les preuves qualifiées ;
  les valeurs `legacyUnknown` et les initialisations de profil ne sont pas
  promues en mesures confirmées.
- Sa sortie structurée contient `state`, `confidence`, `reasons`,
  `blockingFactors`, `priority`, `recommendedAction` et `nextReview`.
- `maintainPlan` est une décision explicite « aucun changement ».
- Une `recommendedAction` reste une recommandation : elle n’applique jamais
  automatiquement une modification de calories ou de macros. Toute décision
  durable relève des lots ultérieurs et reste soumise à l’acceptation de
  l’utilisateur.

## Coach du jour

- La carte « Coach du jour » apparaît sur l’Accueil uniquement après le
  check-in du jour. Elle projette le Coach State longitudinal sans le remplacer.
- Une observation quotidienne qualifiée peut produire « Récupération à
  surveiller », mais ne change jamais à elle seule l’état longitudinal ni le
  plan durable.
- Le Coach du jour ne modifie automatiquement ni calories ni macros. Le toast
  existant confirme l’enregistrement ; la carte porte l’information Coach utile.
- C2 n’ouvre aucun modal automatiquement. Les alertes et comportements de
  safety plus forts relèvent de lots ultérieurs dédiés.

## Performance Strength Coach

- Le moteur C3 est déterministe, explicable et strictement read-only. Il
  analyse les séances, séries et snapshots existants sans modifier le programme
  ni les charges.
- L’éligibilité de progression réutilise la règle pure du générateur Strength
  existant ; C3 ne duplique ni ses seuils ni ses formules.
- Une seule mauvaise séance ne produit jamais `degrading`. `stagnating` exige
  trois expositions consécutives et comparables sans progression ; `degrading`
  exige deux régressions comparables consécutives.
- Une relation `notComparable` casse la chaîne : une tendance n’est jamais
  fabriquée en traversant une exposition non comparable.
- Les tendances au poids du corps ou assistées exigent une pesée
  `userMeasurement`, qualifiée `userMeasured / confirmed` par le contrat C0.
  Une initialisation de profil, une provenance legacy ou un fallback profil ne
  constitue pas une preuve confirmée de performance.
- C3 expose uniquement le volume par exercice via les helpers Strength
  canoniques. Toute formule de volume musculaire direct/indirect reste hors
  périmètre et nécessite une validation produit dédiée.

## Décision Coach intégrée

- C4 croise les sorties C1 et C3 avec le candidat du moteur calorique existant
  selon cet ordre strict : qualité des données, récupération, adhérence
  nutritionnelle, activité réelle, performance, tendance poids/tour de taille,
  nécessité de changer, puis plus petit changement raisonnable.
- Une décision C4 contient une seule action primaire. Les autres signaux restent
  des raisons ou facteurs bloquants et ne créent pas un second levier.
- La performance Strength est un garde-fou : `degrading` ou `mixed` bloque une
  nouvelle réduction calorique, tandis que `stagnating` seul ne la bloque pas.
  `progressing` associé à `truePlateau` peut conduire à maintenir le plan.
- Une mauvaise performance seule ne déclenche jamais une hausse calorique. Une
  proposition protectrice de hausse déjà produite pour `excessiveLoss` reste
  possible même lorsque la performance Strength est mauvaise.
- Le candidat calorique C4 provient exclusivement de la formule existante et
  reçoit une projection provenance-aware des observations C1 : pesées
  `userMeasured / confirmed`, subjectifs `userReported / confirmed` et aucune
  baseline de pas `profileFallback / fallback` présentée comme exploitable.
- C4 est read-only : il ne modifie ni plan Nutrition, ni macros, ni programme
  Strength. Toute modification durable proposée exige l’acceptation explicite
  de l’utilisateur par la mécanique dédiée existante.

## Bilan du Coach

- La page hebdomadaire présente le récit Coach dans l’ordre diagnostic,
  confiance, raisons, signaux, décision, plan et réévaluation. La semaine
  observée reste distincte de la fenêtre longitudinale du Coach.
- C4 est l’unique autorité de décision du bilan. Les métriques corps,
  nutrition, activité et récupération proviennent de son assessment
  provenance-aware ; la performance provient du snapshot C3.
- Le plan contient une seule priorité, celle de `primaryAction`. Les repères
  historiques du suivi hebdomadaire restent secondaires et ne constituent pas
  plusieurs décisions Coach.
- Une proposition calorique n’est actionnable que pour `reviewNutritionTarget`,
  avec un candidat non nul identique à celui du bilan encore `pending`. Le clic
  relit les données et revalide C4 avant de réutiliser l’acceptation existante.
- Si C4 est indisponible, les détails historiques restent consultables mais
  aucune calibration legacy n’est présentée ou applicable comme décision
  Coach. Le snapshot du bilan n’est pas persisté.

## Hub Coach

- La page `/coach` agrège en lecture seule le verdict C2, la décision C4/C5,
  les plans déjà enregistrés et les bilans réellement existants. Son snapshot
  est reconstruit en mémoire et n’est ni persisté ni synchronisé.
- Sans check-in du jour, le Hub demande explicitement le check-in et ne calcule
  aucun verdict anticipé. Une indisponibilité technique reste un état distinct.
- L’Objectif actuel et la Phase Coach sont deux notions distinctes. L’objectif
  reste celui du profil utilisateur ; la phase MVP en est une projection
  exclusive : `loss` → « Déficit actif », `maintenance` → « Stabilisation » et
  `gain` → « Construction ».
- Les signaux C1 à C5 ne changent pas cette phase MVP. Elle est en lecture seule
  et ne déclenche aucune transition automatique ni modification durable.
- La nutrition affiche la cible et les macros déjà calculées pour la date ;
  l’activité et l’entraînement relisent les objectifs et plannings existants.
  L’ouverture du Hub ne recalcule et ne crée aucune cible ni aucun bilan.
- La priorité, son explication, ses facteurs bloquants et la prochaine
  réévaluation proviennent exclusivement de la projection C5 de la décision
  C4. Aucun résumé ou levier supplémentaire n’est généré par C6.
- Le dernier bilan n’est affiché que si une ligne de bilan existe déjà. Le Hub
  est accessible depuis l’Accueil, Progression et la navigation secondaire ;
  les quatre destinations de navigation mobile principales restent inchangées.

## IA photo

- L’analyse exige un consentement explicite.
- La photo est envoyée uniquement au proxy serveur configuré.
- Aucune clé fournisseur n’est exposée au client.
- Le résultat est une estimation à confirmer, jamais une vérité silencieuse.
- Ajouter un fournisseur, un type de donnée ou une automatisation est
  **hors périmètre sans validation explicite**.

## Social et confidentialité

- L’identité sociale est distincte de l’identité technique du compte.
- Les permissions par ami déterminent ce qui est publié et relu.
- Les notes privées ne sont pas partagées par défaut.
- Une donnée distante absente ou refusée ne doit pas être reconstruite à partir
  d’une autre source moins restrictive.

## Statuts de produit

- **Actuel** : implémenté et vérifié.
- **Planifié** : décrit dans la roadmap, non autorisé implicitement.
- **Idée à étudier** : nécessite cadrage et décision.
- **Abandonné** : ne pas réintroduire sans nouvel ADR.
