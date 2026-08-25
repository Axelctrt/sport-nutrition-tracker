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
