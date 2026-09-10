# Coach Strategy — fiches de projection V1

Statut : contrat de lecture STRATEGY-FOUNDATION-01, issu du
[framework produit V1.1](COACH_STRATEGY_FRAMEWORK_V1.md).

Ces fiches précèdent l'implémentation. Elles définissent uniquement la
compatibilité C7, pas des règles de recommandation ou de transition.
L'objectif du profil est une intention utilisateur, pas une preuve d'acceptation
d'une stratégie. Une projection legacy ne crée jamais de phase temporelle.

## Déficit actif

| Champ | Contrat |
| --- | --- |
| Nom | `legacy-loss-projection` |
| Version | 1 |
| Objectif concerné | `loss`, lu dans le profil fourni |
| Stratégie | `activeDeficit`, statut `legacyProjected` uniquement |
| Signaux requis | Objectif existant reconnu ; aucune nouvelle observation |
| Fenêtre d'observation | Non applicable : projection du profil courant, sans analyse temporelle |
| Conditions d'entrée | Profil fourni avec objectif `loss` ; entrée dans la projection, jamais dans une stratégie active |
| Conditions de sortie | Nouvelle entrée de projection avec objectif différent ou absent ; aucun effet sur le profil |
| Exclusions | Objectif absent/invalide ; aucune déduction depuis les mémoires, libellés ou dates |
| Niveau de preuve | Compatibilité logicielle avec le contrat C7 ; aucune efficacité clinique revendiquée |
| Effets autorisés | Lire l'objectif, conserver la projection C7 et son origine, retourner un snapshot détaché |
| Effets interdits | Changer calories/macros/objectif/plan ; proposer ou activer une stratégie ; créer une phase/mémoire ; écrire, synchroniser ou appeler une IA |
| Explication utilisateur attendue | Projection issue de l'objectif de perte ; aucune stratégie acceptée ni date de début attestée. Métadonnées internes, sans nouveau texte UI dans ce lot |

## Stabilisation

| Champ | Contrat |
| --- | --- |
| Nom | `legacy-maintenance-projection` |
| Version | 1 |
| Objectif concerné | `maintenance`, lu dans le profil fourni |
| Stratégie | `stabilization`, statut `legacyProjected` uniquement |
| Signaux requis | Objectif existant reconnu ; aucune nouvelle observation |
| Fenêtre d'observation | Non applicable : projection du profil courant, sans analyse temporelle |
| Conditions d'entrée | Profil fourni avec objectif `maintenance` ; aucune acceptation déduite |
| Conditions de sortie | Nouvelle entrée de projection avec objectif différent ou absent ; aucun effet sur le profil |
| Exclusions | Objectif absent/invalide ; aucune conversion depuis recomposition, récupération ou mémoire |
| Niveau de preuve | Compatibilité logicielle C7 ; pas de prescription de maintien ou de durée de pause |
| Effets autorisés | Lire l'objectif, conserver la projection C7 et son origine, retourner un snapshot détaché |
| Effets interdits | Changer calories/macros/objectif/plan ; proposer une pause ; activer une stratégie ; créer une phase/mémoire ; écrire, synchroniser ou appeler une IA |
| Explication utilisateur attendue | Projection issue de l'objectif de maintien ; aucun épisode de stabilisation ni consentement reconstruit. Aucune modification UI |

## Construction active

| Champ | Contrat |
| --- | --- |
| Nom | `legacy-gain-projection` |
| Version | 1 |
| Objectif concerné | `gain`, lu dans le profil fourni |
| Stratégie | `activeConstruction`, statut `legacyProjected` uniquement |
| Signaux requis | Objectif existant reconnu ; aucune nouvelle observation |
| Fenêtre d'observation | Non applicable : projection du profil courant, sans analyse temporelle |
| Conditions d'entrée | Profil fourni avec objectif `gain` ; aucune acceptation déduite |
| Conditions de sortie | Nouvelle entrée de projection avec objectif différent ou absent ; aucun effet sur le profil |
| Exclusions | Objectif absent/invalide ; aucune inférence de gain musculaire, mini-cut ou transition passée |
| Niveau de preuve | Compatibilité logicielle C7 ; aucune efficacité musculaire ou valeur de surplus prescrite |
| Effets autorisés | Lire l'objectif, conserver la projection C7 et son origine, retourner un snapshot détaché |
| Effets interdits | Changer calories/macros/objectif/plan/programme ; proposer ou activer une stratégie ; créer une phase/mémoire ; écrire, synchroniser ou appeler une IA |
| Explication utilisateur attendue | Projection issue de l'objectif de construction ; aucun épisode temporel connu. Aucune modification UI |

## Assemblage de lecture

- La projection reçoit les snapshots déjà disponibles ; elle ne charge aucun
  repository et n'appelle pas `loadWeeklyReview()` (qui peut écrire).
- Décision, raisons, confiance, plan de revue et prochaine revue viennent du
  même `CoachReviewSnapshot`. Aucune décision n'est recréée depuis la mémoire.
- Le plan courant est copié tel que fourni, sans recalcul ni alignement forcé.
- Safety courante fournie explicitement prévaut pour l'explication comme dans
  C10.1 ; à défaut, conserver la Safety du snapshot C5 en indiquant son origine.
  Distinguer source intégrée, immédiate et snapshot C5. Une absence reste
  indisponible, jamais `clear`. La décision historique/source n'est pas réécrite.
- C8 protège les nouvelles baisses caloriques dans son périmètre existant ;
  aucune permission générale d'adaptation n'est déduite de son statut.
- Les mémoires sont copiées sans reconstruire ni évaluer `observedOutcome`.
- La version 1 est une version de contrat, pas une révision métier ou un ordre
  causal. `updatedAt` ne devient pas une version d'objectif.
- Les formes explicites `proposed`/`active` et épisode identifié sont seulement
  des contrats domaine. Aucun producteur, commande ou entrée d'activation n'est
  ajouté à la projection legacy.
- Aucun branchement UI/runtime existant. Les règles de transition applicables
  et les fiches des stratégies avancées restent hors périmètre.
