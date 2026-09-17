# Coach Strategy — contrats de candidat de transition

Statut : STRATEGY-TRANSITION-01, fondation de contrats uniquement.

## Rôle et frontière

`src/domain/coach/transitionCandidate.ts` décrit un `TransitionCandidate`
non persisté. `createTransitionCandidate()` valide sa structure et retourne
une copie détachée, typée en lecture seule. Ce constructeur n'est pas un
resolver : il n'analyse aucune observation, ne choisit aucune cible et ne
vérifie pas l'admissibilité d'une règle.

Une observation décrit des données. Un candidat décrit une possibilité. Une
proposition persistée, un consentement et une application sont trois étapes
distinctes, toutes absentes de ce lot. Aucun consommateur existant n'est branché.

- `strategyReview` n'a pas de cible ; `reviewOnly` décrit le choix à venir,
  avec des effets explicitement `none`.
- `strategyTransition` exige une cible du contrat existant
  `CoachStrategyKind`. Ses effets restent `notContracted`, accompagnés d'une
  raison, et `explicitAcceptance` ne constitue jamais un consentement reçu.
- `applicability` et les conditions de validité restent `notEvaluated`.
  Un objet structurellement valide ne devient jamais applicable.

Les références de l'acceptation courante (acceptation et proposition), la
révision locale attendue et l'empreinte du contexte sont fournies séparément.
L'objectif est un contexte de profil, pas une autorisation de transition.
La référence de règle comporte une identité et une version ; aucune règle
exécutable ni catalogue de transitions autorisées n'est ajouté.

Les références d'observations réutilisent la forme de `StrategySourceReference`.
Les références de qualité identifient les `SignalQualityAssessment` externes.
Le constructeur contrôle leur forme, pas leur existence, leur espace, leur
fraîcheur ni leur adéquation. Ces vérifications appartiendront à un futur
assemblage cohérent. Une liste vide signifie « aucune référence fournie »,
jamais « preuves suffisantes ». Inconnues et blocages restent explicitement fournis.

Pas d'horloge, génération d'identifiant, expiration calculée, score, classement,
probabilité, écriture, acceptation, activation ou phase. Les champs non définis
sont rejetés. Aucun effet calories/macros, Safety ou plan n'est représenté comme
exécutable. Un couple descriptif `loss` / `stabilization` ne lève aucun garde
du runtime existant et ne constitue ni diet break ni plan de maintien.

## StrategyProposal : évolution différée

Le contrat persistant V1 et sa validation restent inchangés : adoption initiale,
mapping objectif/stratégie strict, une seule acceptation positive. Distinguer
plus tard `initialAdoption` et `strategyTransition` nécessitera une évolution
coordonnée de StrategyState, des validations et de la continuité backup.
Elle n'est pas implémentée ici ; aucune migration n'est créée.

## Décisions futures nécessaires

- Fiches de règles complètes : signaux requis, usages, couverture, fraîcheur,
  dépendances, exclusions et effets autorisés ; aucune valeur inventée ici.
- Acquisition du contexte cohérent et isolé, vérification des références,
  puis évaluation pure distincte du constructeur.
- Validité, obsolescence, expiration et reproposition après refus/report.
- Revalidation transactionnelle, concurrence, idempotence et consentement.
- Cohérence objectif/stratégie/plan avant toute activation, sans modifier
  silencieusement l'objectif ni afficher une stabilisation avec un plan de déficit.

Mini-cut, diet break, reverse diet, refeed, compétition, nouvelle Safety,
automatisation, persistance, migration, backup, sync et UI restent exclus.

Références : [framework produit](COACH_STRATEGY_FRAMEWORK_V1.md),
[état local](COACH_STRATEGY_STATE_V1.md),
[cohérence observée](COACH_STRATEGY_OBSERVED_COHERENCE_V1.md),
[qualité des signaux](COACH_STRATEGY_SIGNAL_QUALITY_V1.md).
