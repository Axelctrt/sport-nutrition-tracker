# Coach Strategy — cohérence observée V1

Statut : contrat informatif **STRATEGY-RULES-01**, après
[Foundation-01](COACH_STRATEGY_RULES_V1.md) et
[Foundation-02](COACH_STRATEGY_STATE_V1.md). Aucun branchement UI, aucune
persistance et aucune autorisation d'implémenter les lots suivants.

## Autorité et portée

Le resolver évalue uniquement une stratégie **déjà acceptée**, issue de
`ActiveStrategyProjection`. L'objectif courant reste celui du profil ; un
objectif divergent bloque la lecture, sans réconciliation. Legacy ne vaut
jamais consentement. Objectif, stratégie, phase et décision restent distincts.

`resolveObservedStrategyCoherence` est une fonction domaine pure.
`assembleObservedStrategyCoherence` reçoit un snapshot détaché des sources et
de l'état Strategy, fourni de façon cohérente dans un seul espace utilisateur.
Il réutilise les calculs C1/C3/C4/C8 avec des adaptateurs mémoire, sans ouvrir
de repository ni appeler les getters qui peuvent écrire. Il n'appelle ni
`propose()`, ni `respond()`, ni `loadWeeklyReview()`, ni commande de cible.
L'assemblage ne crée pas de nouveau mécanisme de lecture transactionnelle.

Le résultat contient la stratégie et sa révision source, l'objectif courant,
la règle/version, la date et période d'analyse, les domaines évalués/non
évaluables, raisons, références de sources, inconnues, contradictions,
domaines à revoir, décision C4 descriptive et Safety avec origine/portée.
La projection de décision exclut son candidat calorique et tout effet
applicable. Aucun score, vote, confiance Strategy ou stratégie suivante.

| Statut | Signification limitée |
| --- | --- |
| `compatible` | Les observations qualifiées **couvertes** ne montrent pas d'incohérence. Nécessite une analyse C1/C4 interprétable, des références corporelles et alimentaires dans sa fenêtre, `onTrack` concordant et `maintainPlan`, sans contradiction ou revue ciblée. Ne valide pas les domaines non évaluables |
| `reviewRecommended` | Restitue une revue ciblée C4/C8 existante ; jamais une réévaluation globale ou une transition |
| `insufficientData` | Acceptation/objectif/analyse absents, qualification insuffisante ou conclusion non établie ; les inconnues ne deviennent pas neutres |
| `blocked` | État invalide, objectif divergent, période/état incohérents, source future/invalide ou présentée à tort comme appartenant à la fenêtre courante |

`compatible` ne signifie **ni optimal, ni globalement sûr, ni efficacité
causale, ni gain musculaire**. L'absence de signaux subjectifs laisse la
récupération non évaluable ; elle n'empêche pas une conclusion explicitement
limitée au corps et au suivi alimentaire si ceux-ci sont qualifiés. Ni C8
`clear`, ni C4 `maintainPlan`, ni C1 `onTrack` seuls ne suffisent.

## Temporalité, preuves et dépendances

- La fenêtre réutilise le contrat C1/C4 existant (actuellement 21 jours à la
  date fournie), ainsi que ses qualifications et blocages, sans nouveau seuil.
  Les sources futures sont exclues à l'assemblage ; le domaine rejette une
  référence future passée directement. Une ancienne mesure n'est pas
  requalifiée en observation corporelle actuelle.
- C3 n'a pas de fraîcheur maximale contractée. Ses expositions restent datées,
  `contextOnly` / `notContracted`. La performance actuelle reste dans les
  domaines non évaluables, même si C3 indique `progressing`. Une revue négative
  déjà portée par C4/C8 peut être restituée **comme revue de ce contexte daté**,
  sans certifier sa fraîcheur actuelle. Aucune durée arbitraire n'est ajoutée.
- L'attribution est toujours `notAssessed` : une fenêtre antérieure ou
  chevauchant l'acceptation n'est jamais un résultat causé par la stratégie.
- Les références sont une **lignée des sources d'entrée** (`sourceLineage`),
  pas des confirmations indépendantes ni une assertion que chaque point a
  été retenu après filtrage des valeurs aberrantes par C1/C4. Les mesures de
  taille restent contextuelles en l'absence d'un contrat de qualité dédié.
- Les références conservent collection, identifiant, date, provenance et
  champs ; elles sont dédupliquées au sein de chaque groupe. C1, assessment
  calorique et C4 partagent leur lignée ; C5/C9 ne sont pas ajoutés comme votes.
- Les quatre signaux sommeil/readiness/faim/énergie relèvent d'un seul domaine
  récupération. C3 et C8 performance partagent les mêmes références. Le poids
  utilisé par une performance au poids du corps/assistée reste une dépendance
  explicite avec sa date/provenance, même ancien. Une source commune entre
  domaines ne devient pas une preuve indépendante.

## Safety inchangée

Safety provient de C8 intégré, ou de C8 immédiat si l'analyse complète n'est
pas disponible. Sans profil, elle reste indisponible. Son autorité est
`c8CalorieDecreaseOnly`, pas une autorisation ou un veto Strategy général.
Un veto aigu reste visible malgré des données longitudinales insuffisantes.
`doNotIntensify` ne devient pas automatiquement `blocked` ; `caution` ne
prescrit aucune nouvelle stratégie ; `clear` ne certifie aucun domaine.

## Fiches versionnées

La version numérique **1** suit Foundation-01/02 ; elle désigne le contrat,
pas une révision de StrategyState ou un ordre temporel. Les conditions ci-dessous
sont des conditions de lecture, jamais d'entrée/sortie de stratégie active.

| Champ | Déficit actif | Stabilisation | Construction active |
| --- | --- | --- | --- |
| Nom | `strategy-active-deficit-observed-coherence` | `strategy-stabilization-observed-coherence` | `strategy-active-construction-observed-coherence` |
| Version | 1 | 1 | 1 |
| Objectif concerné | `loss` | `maintenance` | `gain` |
| Stratégie | `activeDeficit` acceptée | `stabilization` acceptée | `activeConstruction` acceptée |
| Signaux requis | État accepté valide, objectif concordant ; C1/C4 qualifiés et références corporelles/alimentaires pour une conclusion compatible ; C3/C8 selon leur portée | Mêmes exigences, trajectoire confrontée au maintien par C1/C4 | Mêmes exigences, trajectoire confrontée à la prise par C1/C4 ; C3 ne prouve pas une efficacité musculaire actuelle |
| Fenêtre d'observation | Fenêtre canonique C1/C4 ; expositions C3 datées sans fraîcheur garantie | Identique | Identique |
| Conditions d'entrée | Lecture explicite, état/objectif valides ; aucun changement de stratégie | Identique | Identique |
| Conditions de sortie | Nouveau snapshot à partir de nouvelles entrées ; aucune transition ni sortie d'état actif | Identique | Identique |
| Exclusions | Legacy non accepté, objectif divergent, sources non qualifiées ; aucun déficit dit optimal ni recomposition déduite d'un plateau + progression | Aucune conversion loss/gain vers maintien, durée minimale ou « reset métabolique » | Aucune promesse de muscle, nouveau surplus, mini-cut ou stabilisation |
| Niveau de preuve | Cohérence descriptive des observations couvertes selon les contrats existants, jamais preuve clinique/causale | Identique | Identique |
| Effets autorisés | Retourner un résultat détaché ; conserver perte excessive, activité basse, récupération/performance à revoir selon C4/C8 | Décrire la trajectoire couverte ; restituer une revue de dérive uniquement si C4/C8 la justifie | Décrire la trajectoire couverte ; conserver prise excessive/revue existante ; stagnation C3 isolée informative |
| Effets interdits | Toute proposition/activation, modification de plan/calories/macros/objectif/phase/StrategyState/C9/Safety/sync, écriture ou IA | Identiques | Identiques |
| Explication utilisateur attendue | Observations compatibles seulement dans la portée déclarée, ou revue ciblée existante avec raisons et limites ; aucun choix automatique | Même limitation au maintien observé, aucune prescription de pause | Même limitation aux observations couvertes ; aucune affirmation de construction efficace depuis une ancienne progression |

## Paramètres non contractés et exclus

Restent non contractés : fraîcheur maximale C3 et poids dépendant, couverture
requise pour une conclusion globale, indépendance de fenêtres glissantes,
temporalité d'attribution au consentement, succès causal d'une stratégie,
convergence multi-domaines et seuil de réévaluation globale. Le resolver ne
leur attribue aucune valeur. Une conclusion qui en dépend reste bornée ou
`insufficientData`.

Pas de transition, proposition automatique, phase temporelle, objectif atteint,
pause structurée, mini-cut/diet break/refeed/reverse/compétition, recomposition
exécutable, mémoire, nouveau transport cloud ou IA. Les moteurs et commandes
C1 à C10.1, le plan et les contrats Foundation-01/02 restent inchangés.
