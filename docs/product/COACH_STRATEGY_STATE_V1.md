# Coach Strategy State — Foundation-02

Statut : contrat du lot Foundation-02, après intégration de Foundation-01.
Ce lot fournit des contrats et commandes applicatives, pas un moteur de
recommandation ni une nouvelle interface. Les projections C7, Hub et C10.1
existantes restent inchangées. Les lots suivants ne sont pas autorisés ici.

## Autorité et consentement

Objectif, stratégie, phase et décision restent distincts. `CoachStrategyState`
est la seule source de l'état Strategy : ni C7, ni un bilan C5, ni la mémoire C9
ne constituent une acceptation. `ActiveStrategyProjection` lit uniquement cet
état, sans écriture, horloge, génération d'identifiant ou épisode de phase.

- `legacy` : continuité technique avec origine `migration` ou
  `legacyCompatibility`. Aucune acceptation, décision passée, date d'activation
  ou phase temporelle n'est inventée.
- `pending` : proposition explicite fournie à la commande, sans activation.
- `accepted` : réponse utilisateur factuelle liée à l'identifiant et à la
  version de cette proposition. L'état actif référence ce reçu unique.
- `rejected` : refus conservé, sans effet sur l'état actif ou le plan.

Les raisons et le contexte de proposition proviennent de l'analyse C4 et du
snapshot C5 existants. Ils ne prétendent pas que C4 a choisi une stratégie : le
choix est une entrée explicite de la commande. L'explication utilise C10.1
sans nouvelle synthèse. Les bilans, ajustements et mémoires ne sont pas écrits.

## Fiches de règle — adoption explicite initiale uniquement

Ces fiches complètent les [règles de lecture Foundation-01](COACH_STRATEGY_RULES_V1.md),
qu'elles ne transforment pas en commandes automatiques.

| Nom | Version | Objectif concerné | Stratégie |
| --- | --- | --- | --- |
| `initial-loss-acceptance` | 1 | `loss` | `activeDeficit` |
| `initial-maintenance-acceptance` | 1 | `maintenance` | `stabilization` |
| `initial-gain-acceptance` | 1 | `gain` | `activeConstruction` |

Le contrat suivant s'applique intégralement à chacune des trois fiches :

| Champ | Contrat |
| --- | --- |
| Signaux requis | Profil et paramètres existants ; contexte C4/C5/C8 obtenu par les calculs existants ; aucune nouvelle mesure |
| Fenêtre d'observation | Fenêtre C4 existante à la date de référence fournie ; aucune fenêtre ni seuil Strategy supplémentaire |
| Conditions d'entrée | Stratégie fournie explicitement, correspondant à l'objectif ; aucune stratégie déjà acceptée ; proposition/version en attente et consentement explicite |
| Conditions de sortie | Une réponse acceptée ou refusée clôt la proposition ; aucune sortie de stratégie active n'est implémentée |
| Exclusions | Objectif inconnu, contexte incomplet, version/contexte périmé, activation déjà réalisée ; stratégies avancées, révocation et transitions exclues |
| Niveau de preuve | Contrat logiciel de représentation du consentement ; aucune efficacité clinique ou recommandation de stratégie déduite |
| Effets autorisés | Conserver la proposition puis la réponse et sa référence active dans une transaction locale ; préparer l'explication existante |
| Effets interdits | Modifier calories, macros, objectif, programme, décision C4, règles C8 ou mémoire C9 ; créer une phase, une transition, une IA ou un transport cloud |
| Explication utilisateur attendue | Contexte et raisons C4/C5 via C10.1 ; origine legacy distinguée de l'acceptation explicite ; aucune promesse ni recommandation automatique |

## Atomicité et revalidation

Les sources sont lues dans la même transaction Dexie que l'écriture Strategy.
Les adaptateurs mémoire appellent les calculs C4/C5/C8 inchangés, sans passer
par les getters qui normalisent et écrivent les paramètres. Un contexte absent
reste une erreur, jamais une Safety `clear` fabriquée.

Chaque commande attend la révision locale exacte. L'acceptation exige aussi
la même date d'analyse, le même objectif et la même empreinte SHA-256 des
sources que la proposition. L'empreinte est un test d'égalité conservateur,
pas un ordre : une modification même ancienne par horloge rend la proposition
périmée. Un changement de source sans effet sur le verdict peut donc nécessiter
une nouvelle proposition. Aucun seuil de fraîcheur ou arbitrage temporel n'est
inventé. Safety reste du contexte : aucun veto Strategy n'est ajouté.

Le reçu et la référence active sont écrits ensemble. Un échec annule toute la
transaction. La clé d'idempotence identifie une réponse précise : un retry exact
rend le reçu initial sans nouvelle date/révision, même après changement du
contexte. Réutiliser la clé pour un autre choix échoue. Une réponse refusée
peut être conservée même si le contexte a changé : elle n'applique rien.

## Continuité et limites explicites

- AppDB **13 → 14** : table locale `coachStrategyStates`, une ligne validée par
  espace. Aucun changement de migration historique. Base neuve : aucune ligne
  créée par une lecture ; la première proposition conserve la compatibilité
  du profil déjà présent.
- Backup JSON **12 → 13** : migration additive legacy, export/import de l'état
  et validation stricte des références, unicités, statuts et consentement actif.
  Le restore profil/paramètres remplace cet état ; les autres catégories le
  conservent. Une sauvegarde courante sans état reste sans état.
- L'import invité préserve le StrategyState du compte, sans copier une réponse
  de l'espace invité. Le changement de compte est contrôlé avant les lectures
  et avant l'écriture. La suppression complète efface aussi cet état local.
- **Local uniquement** : pas de synchronisation multi-appareils, pas de nouvel
  agrégat cloud, pas de résolution de conflit. L'acceptation d'un appareil ne
  devient pas automatiquement celle d'un autre. Un transfert explicite passe
  par la restauration contrôlée d'une sauvegarde.
- Un changement ultérieur de profil ne réécrit pas une acceptation passée.
  Son objectif associé reste factuel ; la politique de transition/révocation
  et son éventuelle UX nécessitent un cadrage ultérieur.
- Pas de branchement UI, de nouvelle Safety, de mémoire Strategy dupliquée
  dans C9, de modification de plan, de mini-cut/reverse/refeed/compétition ou IA.

Validation : tests domaine, transactions/reload/isolation, migration AppDB et
backup, restauration sélective/import invité, non-régression C4/C5/C8/C9/C10.1,
suite complète, stabilité, build, audits et gates GitHub existants.
