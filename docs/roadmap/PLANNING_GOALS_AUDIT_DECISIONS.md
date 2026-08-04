# Décisions produit — Planning, Objectifs et Progression

Statut : **validé par le propriétaire le 4 août 2026**.

## Source de vérité

- dépôt : `Axelctrt/sport-nutrition-tracker` ;
- branche auditée : `develop` ;
- commit audité : `417d1fc8e18239adbf511ba9d0571b91e1a8b606` ;
- audit réalisé en lecture seule ;
- aucune modification fonctionnelle n’est autorisée par ce document seul.

## Architecture validée

Les responsabilités restent séparées :

- **Planning** décrit les actions sportives prévues ;
- **Objectifs** décrit les résultats mesurables recherchés ;
- **Progression** et **Bilan hebdomadaire** constituent le pont entre le prévu,
  le réalisé et le résultat observé.

Planning et Objectifs ne doivent pas être fusionnés dans un même écran, un même
modèle de données ou un même formulaire. Les liens entre eux restent explicites
et ne créent automatiquement aucune séance, aucun programme et aucun objectif.

## Décision sur le type d’un objectif

Après la création d’un objectif, sa métrique devient non modifiable.

Restent modifiables :

- le titre ;
- la cible ;
- la date de départ ;
- l’échéance facultative.

Changer de métrique nécessite de créer un nouvel objectif. Cette règle évite de
réinterpréter une valeur existante dans une autre unité et de conserver des
jalons ou une progression devenus incohérents.

## Minutes d’activité et absence de double comptage

L’objectif `Cumuler des minutes d’activité` doit couvrir :

- les activités générales enregistrées ;
- les séances détaillées de musculation terminées.

Chaque activité physique doit contribuer une seule fois. La règle validée est :

1. additionner les durées des activités générales postérieures ou égales à la
   date de départ de l’objectif ;
2. examiner chaque séance détaillée de musculation terminée sur la même période ;
3. lorsque `WorkoutSession.completedActivityId` référence une activité générale
   déjà comptée, ne pas ajouter une seconde fois la durée de la séance ;
4. lorsqu’aucune activité générale liée n’existe, ajouter la
   `WorkoutSession.durationMinutes` si elle est définie et strictement positive ;
5. une activité générale de musculation non liée à une séance détaillée reste
   comptée comme toute autre activité ;
6. ne faire aucun rapprochement approximatif par date, titre ou durée.

Cette évolution modifie uniquement l’agrégation de l’objectif concerné. Elle ne
modifie aucune formule calorique, aucune activité enregistrée et aucun planning.

## Défauts retenus

### Planning

- le titre de route `Planning de musculation` ne correspond plus au planning
  sportif unifié ;
- l’action `Prévoir` du hub Sport mène à la section des activités à venir au lieu
  de conduire à la création ;
- sur mobile, la consultation de la semaine arrive après plusieurs formulaires
  et actions secondaires ;
- les parcours musculation et endurance utilisent des architectures internes
  différentes qui doivent rester isolées lors de la normalisation visuelle.

### Objectifs

- le changement de métrique en modification peut réinterpréter une cible dans
  une unité incompatible ;
- l’édition inline n’est pas cohérente avec le contrat UX désormais validé pour
  les surfaces d’édition ;
- l’objectif de minutes d’activité ne couvre pas actuellement toutes les
  séances détaillées de musculation ;
- les intitulés `Profil et objectifs` et `Objectifs et jalons` entretiennent une
  ambiguïté entre objectif nutritionnel et objectif de progression.

## Roadmap de PR limitée

### PR A — Restructurer le Planning sportif

Périmètre :

- afficher la semaine et son résumé avant les outils de création ;
- proposer une action principale `Planifier` ;
- choisir `Musculation` ou `Endurance` dans une surface dédiée mobile-first ;
- placer `Répéter cette semaine` parmi les actions secondaires ;
- distinguer les destinations `Planifier` et `Voir les activités à venir` ;
- normaliser le titre visible et les métadonnées en `Planning sportif` ;
- conserver la route historique `/strength/planning` pour compatibilité ;
- conserver les modèles, la persistance, le rapprochement prévu/réalisé et les
  recalculs existants.

Hors périmètre : formules caloriques, schéma de données, migration, Objectifs,
thèmes, IA, release et production.

Validation attendue : tests unitaires ciblés, tests de navigation, E2E Chromium
mobile et WebKit iPhone 15 sur création musculation/endurance, consultation de
la semaine et absence de débordement horizontal. La CI complète n’est requise
qu’une fois le périmètre stabilisé avant fusion.

### PR B — Sécuriser les Objectifs de progression

Périmètre :

- consultation initiale en lecture seule ;
- création et édition dans une surface dédiée ;
- protection des modifications non enregistrées ;
- métrique non modifiable après création ;
- correction de l’agrégation des minutes d’activité selon la règle validée ;
- clarification des intitulés entre objectif nutritionnel et objectif de
  progression ;
- conservation des autres calculs de progression et des jalons existants.

Hors périmètre : création automatique de planning, modification des formules
caloriques, nouvelles métriques, migration, thèmes, IA, release et production.

Validation attendue : tests unitaires de la règle anti-double comptage, test du
verrouillage de métrique, tests des changements non enregistrés, responsive et
WebKit ciblés. La CI complète n’est requise qu’une fois avant fusion.

### PR C — Relier un objectif à une action

Option ultérieure, soumise à une nouvelle validation produit : liens contextuels
vers Planning ou les écrans de saisie pertinents, sans création automatique et
sans recommandation générative.

## Ordre retenu

1. PR A — Planning sportif ;
2. PR B — Objectifs de progression ;
3. PR C — optionnelle après retour d’usage.
