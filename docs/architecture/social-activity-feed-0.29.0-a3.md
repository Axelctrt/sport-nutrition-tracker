# SportPilot 0.29.0 — A3 — Projection filtrée des activités réelles

## Statut

- sous-phase : A3 ;
- branche : `feature/social-activity-feed-0.29.0` ;
- base : commit `694bcdb` ;
- migration : aucune ;
- branchement runtime : aucun ;
- interface : aucune modification ;
- version applicative : inchangée.

## Objectif

Transformer les modèles réellement persistés par SportPilot en snapshots sociaux 0.29 strictement filtrés, sans copier l'activité métier complète et sans simuler de métriques absentes.

La projection reste pure et indépendante du stockage cloud. Elle sera branchée sur les événements d'enregistrement, de modification et de suppression dans une sous-phase ultérieure.

## Sources métier prises en charge

### Activités cardio et endurance

Source : `Activity`.

Données projetables selon la politique effective :

- date et heure locale ;
- durée ;
- intensité ;
- calories effectives ;
- distance ;
- allure de course calculée avec le calcul métier existant ;
- rythme de natation en secondes par 100 mètres ;
- vitesse moyenne vélo calculée avec le calcul métier existant ;
- dénivelé ;
- cadence de course ;
- type de séance ;
- terrain ;
- nage principale ;
- longueur de bassin ;
- type de vélo ;
- environnement.

Les champs `intervalDetails` ne sont pas transformés en intervalles structurés. Ils restent exclus, car il s'agit actuellement d'un texte libre et non d'une série persistée exploitable sans ambiguïté.

Aucun graphique, tour, segment, série de rythme ou fréquence cardiaque n'est généré lorsque la source ne contient pas réellement ces données.

### Séances de musculation

Source : agrégat constitué de :

- `WorkoutSession` ;
- `WorkoutSessionExercise` ;
- `StrengthSet` ;
- `ExerciseDefinition`, lorsqu'elles sont disponibles.

Seules les séances au statut `completed` sont projetables.

Données projetables selon la politique effective :

- nom de séance ;
- date et heure de début ;
- durée ;
- nombre d'exercices ;
- groupes musculaires ;
- exercices ;
- séries terminées ;
- répétitions ;
- charges ;
- indication poids du corps ;
- RPE ;
- volume chargé en kilogrammes.

Les séries non terminées et les données appartenant à une autre séance sont ignorées.

Le volume est calculé uniquement à partir des séries terminées dont l'unité de charge est `kg`. Les exercices au poids du corps ne reçoivent aucune charge corporelle inventée, car le poids du pratiquant n'est pas persisté sur la série.

Les durées et distances de série ne sont pas encore publiées : le contrat de partage ne dispose pas encore d'options dédiées permettant de les autoriser ou les masquer séparément.

## Confidentialité

La projection reçoit une politique déjà limitée au destinataire.

Elle applique les règles suivantes :

- politique privée ou destinataire sans accès : aucun snapshot actif ;
- accès résumé : résumé uniquement, sans détail ;
- accès détaillé ou personnalisé : seulement les champs explicitement autorisés ;
- charges masquées : exercices, séries et répétitions peuvent rester visibles ;
- poids du corps : indication publiée uniquement si le champ `bodyweight` est autorisé ;
- notes de séance, d'exercice et de série : jamais copiées ;
- calcul interne de calories, poids utilisé, MET et coefficients : jamais copiés ;
- identifiants techniques enfants : jamais copiés.

## Révision déterministe

Pour une activité simple, `sourceRevision` utilise `activity.updatedAt`.

Pour une séance de musculation, la révision correspond à la date de mise à jour la plus récente parmi :

- la séance ;
- ses exercices ;
- ses séries terminées ;
- les définitions d'exercices effectivement référencées.

Cette règle permet de régénérer le snapshot lorsqu'un élément réellement projeté change.

## Évolution du contrat de snapshot

Le contrat passe à `0.29.0-a3` et ajoute :

- `occurredTime` pour conserver une heure locale sans fabriquer de fuseau horaire ;
- `paceSecondsPer100Meters` pour représenter correctement le rythme de natation.

## Hors périmètre A3

- écriture Dexie des nouveaux snapshots ;
- file de synchronisation ;
- D1 et Pages Functions ;
- génération automatique après sauvegarde ;
- suppression et tombstones runtime ;
- réglages dans les formulaires ;
- cartes et écrans de détail ;
- graphiques sociaux ;
- parsing du texte libre d'intervalles.
