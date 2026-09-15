# Coach Strategy — Signal Quality V1

## Statut et objectif

Contrat STRATEGY-SIGNAL-QUALITY-01 : qualification informative par **signal et
usage demandé**, non persistée. La question est « cette donnée peut-elle
participer à cette conclusion précise ? », jamais « cette stratégie est-elle
bonne ? ». Aucun consommateur UI ou moteur existant n'est branché sur ce rapport.

Références : [framework produit](COACH_STRATEGY_FRAMEWORK_V1.md),
[état Strategy](COACH_STRATEGY_STATE_V1.md),
[cohérence observée Rules-01](COACH_STRATEGY_OBSERVED_COHERENCE_V1.md).

## Architecture et contrat

`src/domain/coach/strategySignalQuality.ts` qualifie une source pour un usage.
`src/application/coach/strategySignalQualityService.ts` assemble des snapshots
explicitement fournis. Aucun chargement de repository, appel des moteurs,
normalisation, horloge implicite, réseau ou écriture. Les sorties sont détachées.

`SignalQualityAssessment` expose :

- `signal`, `domain`, `intendedUse`, `source` (snapshot exact, identité, références,
  dérivations et événements factuels) ;
- `availability` : `absent`, `partial`, `present`, `invalid` ;
- `usability` : `usable` (participe à cet usage), `limited` (contexte seulement,
  pas de conclusion forte), `unusable` (ne pas utiliser pour cet usage) ;
- `reasonCodes`, `freshness`, `comparability`, `coverage`, `dependencies` ;
- `observationPeriod`, `strategyTemporalContext`, `limitations`,
  `attribution: notAssessed`.

Les usages sont fermés : observation enregistrée, comparaison enregistrée,
conclusion longitudinale, performance historique, performance actuelle,
contexte source C1/C4, contexte Safety C8. Un usage incompatible est inutilisable.
Il n'existe ni agrégat de fiabilité, ni score, ni probabilité, ni vote.

## Sources et limites par domaine

| Source | Usage permis et limites |
| --- | --- |
| C0 poids | Une mesure confirmée est utilisable comme observation datée ; seule, elle reste limitée pour une tendance. Valeur, date, provenance et qualification sont conservées. |
| C0 récupération | Une déclaration confirmée décrit le ressenti ponctuel ; elle ne devient ni diagnostic ni preuve chronique. |
| C0 dérivé/fallback/initialisation/legacy | Contexte limité, jamais mesure indépendante confirmée, même si une qualification contradictoire prétend `confirmed`. |
| Nutrition, observation C1 | Journée complète avec consommation disponible : observation utilisable. Comparaison enregistrée uniquement avec cible positive disponible ; aucune formule ou moyenne recalculée. Journal incomplet/absent et cible manquante restent explicites. |
| Activité, observation C1 | Pas réellement saisis conservés ; estimation attendue et provenance conservées. La comparaison reste limitée, aucune nouvelle certification d'adhérence. |
| C1 résultat | État, raisons, blocages et confiance existants conservés comme contexte. Les fenêtres, minima, filtres et calculs restent propriétaires de C1. La confiance globale ne certifie aucun domaine individuellement. |
| C3 | Dates, expositions, relations et tendance conservées. Une progression ancienne peut être décrite historiquement. Rupture `notComparable` ou résultat insuffisant : limité. Aucun délai maximal, couverture minimale ou validité actuelle inventés. |
| C4 | Décision descriptive, raisons, blocages, prochain bilan, période et références conservés ; aucun candidat calorique applicable exporté. Ce n'est jamais une preuve indépendante. |
| C8 | Snapshot, origine et portée `c8CalorieDecreaseOnly` conservés exactement. `clear` ne certifie pas une évaluation globale. Même une annotation inutilisable n'efface ni ne relâche un veto C8. |

`coverage` reste `notContracted` : le framework ne copie pas les minima des
moteurs. `datedObservation` décrit une date, **pas** une fraîcheur acceptable.
La fraîcheur C3 reste `notContracted`, y compris pour une exposition récente.
Les références sont une lignée de sources, pas nécessairement les contributeurs
retenus après filtrage C1. L'âge réel d'un poids utilisé indirectement par C3
doit être transmis dans les références dérivées, sans seuil ajouté.

## Temporalité descriptive

Le service reçoit une projection Strategy et, si disponible, une borne locale
explicitement convertie dans le calendrier des observations, liée à la même
acceptation. Il ne tronque pas silencieusement un timestamp UTC en date locale.
Sans cette borne ou en legacy : `unknown`. Aucune reconstruction depuis C9.

- Fenêtre entièrement avant/après : `beforeAcceptance` / `afterAcceptance`.
- Fenêtre de part et d'autre : `overlapsAcceptance`.
- Borne touchée ou observation du même jour : `boundaryUncertain`.
- Date/période inconnue ou invalide : `unknown`.

`afterAcceptance` ne prouve ni causalité, ni adhérence, ni effet de stratégie.
Aucun épisode, transition ou historique n'est créé.

## Dépendances, isolation et responsabilité de l'appelant

Les demandes contiennent un `scopeKey` opaque commun au contexte Strategy et à
tous les snapshots ; tout mélange est rejeté. Ce garde-fou ne remplace pas
l'isolation du repository appelant : l'appelant fournit des sources déjà isolées,
cohérentes et issues des contrats typés existants, pas des JSON non validés.
La couche ne peut vérifier la véracité d'une étiquette d'espace fournie.

L'appelant fournit les périodes réelles et références connues ; pas d'inférence
de fenêtre depuis une décision sans dates de sources. Une demande de source
absente doit être explicite (`value: undefined`, ou C8 `unavailable`). Une liste
vide signifie « rien fourni », pas « tout évalué ».

Les liens `sameSource`, `derivation`, `sameEvent` et `commonWindow` sont conservés
entre qualifications. Deux champs d'une même ligne restent dépendants, même si
leurs noms diffèrent. Une fenêtre commune n'est pas un événement physiologique
commun ; un événement doit avoir une identité explicitement fournie. Fatigue,
énergie et sommeil ne deviennent pas trois votes. L'absence de lien connu ne
certifie jamais l'indépendance (`independence: notEstablished`).

Les demandes identiques sont dédupliquées. Plusieurs contenus sous une même
identité de snapshot sont tous conservés comme contradictoires/inutilisables,
sans choix par horloge. Deux vues du même signal, champ source et période avec
des contenus différents sont également contradictoires, même si leurs identités
de snapshot diffèrent. Le service ne fusionne pas des versions concurrentes.
Les dates invalides/futures, périodes contradictoires et valeurs numériques
invalides des observations sont signalées sans substitution de données.

## Exemples et exclusions

Une pesée de 70 kg confirmée : `recordedObservation=usable`,
`longitudinalConclusion=limited`. C3 `progressing` en 2020 : contexte historique
descriptible, `currentPerformance=limited`. C8 `doNotIntensify` reste exactement
ce statut, quels que soient les autres résultats Signal Quality.

Pas de recommandation Strategy, proposition, transition, score composite,
nouvelle règle Safety, modification calories/macros ou StrategyState. Aucun
changement C1/C3/C4/C5/C8, Rules-01, UI, Dexie, migration, backup ou sync.
Les stratégies avancées et futurs consommateurs exigent des contrats et une
autorisation distincts ; ce rapport ne constitue pas leur moteur d'éligibilité.
