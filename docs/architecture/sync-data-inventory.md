# Inventaire des données pour la synchronisation

- **Projet :** SportPilot
- **Base vérifiée :** `feature/sync-data-readiness` au commit `33eb416`
- **Date de mise à jour :** 29 juin 2026
- **Schéma local :** Dexie v8
- **Sauvegarde :** JSON v7
- **Objet :** frontière synchronisable/local après la phase B

## 1. Légende

| Classe | Signification |
|---|---|
| Synchroniser | Donnée métier utilisateur à répliquer |
| Local | Donnée propre à l’appareil, technique ou recalculable |
| Synchroniser avec règle | Donnée utilisateur nécessitant une règle métier avant généralisation |
| À séparer avant généralisation | Table contenant encore plusieurs provenances ou responsabilités |

## 2. Tables utilisateur Dexie

Le schéma v8 déclare **30 tables utilisateur**. Elles sont exportées par le backup JSON v7.

| Table | Contenu | Cible | Préparation après phase B |
|---|---|---|---|
| `userProfile` | Profil | Synchroniser | ID singleton stable ; mises à jour partielles |
| `userSettings` | Préférences du compte | Synchroniser | Séparé de l’appareil en v7 |
| `weights` | Pesées datées | Synchroniser | ID déterministe par date ; domaine du prototype C |
| `dailySteps` | Pas journaliers | Synchroniser avec règle | ID déterministe ; provenance future à distinguer |
| `activities` | Activités | Synchroniser | IDs universels ; suppression marquée |
| `foodProducts` | Produits durables et références alimentaires | À séparer avant généralisation | Distinguer données utilisateur et cache externe |
| `meals` | Repas par date et créneau | Synchroniser | ID déterministe date/créneau |
| `foodEntries` | Lignes alimentaires | Synchroniser | IDs universels ; enfants de repas |
| `favoriteMeals` | Repas favoris | Synchroniser | Mise à jour partielle |
| `recipes` | Recettes | Synchroniser | Parent avec suppression en cascade |
| `recipeIngredients` | Ingrédients | Synchroniser | Enfants ; ordre stable |
| `dailyTargets` | Objectifs nutritionnels journaliers | Synchroniser | ID déterministe par date |
| `dailyJournalStatuses` | Statut du journal | Synchroniser | ID déterministe par date |
| `weeklyReviews` | Bilans hebdomadaires | Synchroniser avec règle | ID déterministe ; décision utilisateur prioritaire |
| `acceptedCalorieAdjustments` | Ajustements acceptés | Synchroniser avec règle | Historique métier ; chevauchements à contrôler |
| `exerciseDefinitions` | Catalogue et exercices personnalisés | À séparer avant généralisation | Distinguer catalogue fourni et ajouts utilisateur |
| `workoutTemplates` | Modèles de musculation | Synchroniser | Parent ; mises à jour partielles |
| `workoutTemplateExercises` | Exercices des modèles | Synchroniser | Enfants ; ordre stable |
| `workoutSessions` | Séances | Synchroniser avec règle | Verrou obligatoire pour `inProgress` |
| `workoutSessionExercises` | Exercices d’une séance | Synchroniser | Enfants ; suppression marquée |
| `strengthSets` | Séries | Synchroniser | IDs universels ; enfants de séance |
| `progressionSuggestions` | Suggestions et décisions | À séparer avant généralisation | Recalculer la proposition, synchroniser la décision |
| `goals` | Objectifs personnels | Synchroniser | Migré depuis `localStorage` en v5 |
| `endurancePlanningSessions` | Planning d’endurance | Synchroniser | Migré depuis `localStorage` en v5 |
| `earnedAchievements` | Badges acquis | Synchroniser | Migré en v6 ; acquisition monotone |
| `unlockedVisualThemes` | Thèmes débloqués | Synchroniser | Migré en v6 ; acquisition monotone |
| `visualThemePreferences` | Thème de récompense actif | Synchroniser | Le mode clair/sombre reste local |
| `weeklyMissionCompletions` | Missions terminées | Synchroniser | Migré en v6 ; clé par semaine |
| `routineReminderCompletions` | Rappels terminés | Synchroniser | Migré en v6 ; affichage/report restent locaux |
| `deletionRecords` | Intentions de suppression/restauration | Synchroniser | Ajouté en v8 ; exporté dans le backup v7 |

## 3. Tables internes locales

| Table | Contenu | Backup v7 | Synchronisation | Justification |
|---|---|---:|---:|---|
| `deviceSettings` | Préférences et identité de l’installation | Non | Non | Spécifique à l’appareil |
| `migrationJournal` | Historique des migrations locales | Non | Non | Dépend de la base locale |
| `databaseDiagnostics` | Rapports d’intégrité | Non | Non | Technique et recalculable |
| `trashItems` | Snapshots complets de récupération | Non | Non | Peut contenir des données sensibles ; rétention locale de 30 jours |

La suppression durable est portée par `deletionRecords`, pas par la réplication des snapshots `trashItems`.

## 4. Paramètres

### 4.1 `userSettings` — synchronisable

- `includedBaseSteps` ;
- `walkingKcalPerKgPerKm` ;
- `runningKcalPerKgPerKm` ;
- `strengthTrainingMet` ;
- `calorieFloorBmrMultiplier` ;
- `defaultCyclingMet` ;
- `defaultWalkingMet` ;
- `defaultOtherCardioMet` ;
- `swimmingMetValues` ;
- `maximumWeeklyAdjustmentKcal` ;
- `maximumCumulativeAdjustmentKcal` ;
- `enduranceTemplates` ;
- `enduranceTemplatesVersion` ;
- `dashboardPreferences` ;
- `routineReminderPreferences`.

### 4.2 `deviceSettings` — local

- `deviceId` ;
- `theme` clair/sombre/système ;
- `requestPersistentStorage` ;
- `backupReminderIntervalDays` ;
- `restTimerAutoStart` ;
- `restTimerSoundEnabled` ;
- `restTimerVibrationEnabled` ;
- `lastBackupExportedAt` ;
- `lastBackupAppVersion` ;
- `lastBackupSchemaVersion`.

Le thème visuel de récompense actif reste dans `visualThemePreferences` et suit le compte.

## 5. Stockages navigateur

### 5.1 Anciennes clés utilisateur

Les clés suivantes ne sont plus la source persistante normale :

| Clé historique | Source actuelle | Rôle résiduel |
|---|---|---|
| `sport-pilot.achievements` | `earnedAchievements` | migration héritée / secours après échec Dexie |
| `sport-pilot.reward-themes` | `unlockedVisualThemes` et `visualThemePreferences` | migration héritée / secours |
| `sport-pilot.weekly-mission-history` | `weeklyMissionCompletions` | migration héritée / secours |
| `sportpilot:goals:v1` | `goals` | migration héritée / secours |
| `sportpilot:endurance-planning:v1` | `endurancePlanningSessions` | migration héritée / secours |
| clé historique des complétions de rappels | `routineReminderCompletions` | migration héritée / secours |

Au démarrage, `initializeUserStateRuntime()` migre l’ancien contenu puis hydrate les caches mémoire depuis Dexie.

### 5.2 Clés locales légitimes

Restent locales :

- `sport-pilot.theme` : cache de démarrage du thème clair/sombre/système ;
- report du rappel global de sauvegarde ;
- dernier affichage et report des routines ;
- état ouvert/fermé des sections ;
- recherches récentes ;
- dernier diagnostic technique ;
- garde de rechargement PWA en `sessionStorage`.

Ces valeurs ne sont ni exportées ni synchronisées.

## 6. Suppressions et restauration

Entités couvertes par la corbeille :

- `activity` ;
- `weight` ;
- `foodEntry` ;
- `meal` ;
- `favoriteMeal` ;
- `recipe` ;
- `strengthSet` ;
- `workoutSessionExercise`.

Pour chaque cible :

```text
id = deletion:<entityType>:<entityId>
status = deleted | restored
```

Les suppressions en cascade produisent également des marqueurs pour :

- les entrées d’un repas ;
- les ingrédients d’une recette ;
- les séries d’un exercice de séance.

La purge ou l’expiration de `trashItems` ne supprime pas le marqueur.

## 7. Données externes et recalculables

### 7.1 Open Food Facts

Ne pas synchroniser comme données utilisateur :

- résultats de recherche ;
- caches temporaires ;
- diagnostics réseau ;
- contenu récupérable depuis l’API.

Avant la généralisation de `foodProducts`, distinguer explicitement :

- produit personnalisé ;
- correction personnelle ;
- favori ;
- snapshot nécessaire à l’historique ;
- cache externe.

### 7.2 Catalogue d’exercices

- catalogue fourni : local, versionné par l’application ou realm public en lecture seule ;
- exercice personnalisé : privé et synchronisé.

La provenance doit être explicite avant la phase D.

### 7.3 Données dérivées

À recalculer lorsque les sources sont synchronisées :

- analyses sur 12 semaines ;
- records ;
- adhérence au planning ;
- tendances ;
- recommandations calculées ;
- agrégats du tableau de bord ;
- diagnostics.

À synchroniser :

- décision d’accepter une recommandation ;
- état d’un objectif ;
- bilan validé ;
- historique nécessaire à une récompense.

## 8. Unicités métier

| Domaine | Clé logique | État après phase B |
|---|---|---|
| Profil | singleton | ID constant |
| Paramètres utilisateur | singleton | ID constant |
| Pesée | date | ID déterministe |
| Pas | date | ID déterministe |
| Repas | date + créneau | ID déterministe |
| Objectif journalier | date | ID déterministe |
| Statut journal | date | ID déterministe |
| Bilan hebdomadaire | début de semaine | ID déterministe |
| Mission | début de semaine | ID déterministe |
| Badge | identifiant du badge | ID déterministe |
| Thème débloqué | identifiant du thème | ID déterministe |
| Rappel terminé | date + type | ID déterministe |
| Suppression | type + ID d’entité | ID déterministe |

Une contrainte d’index unique reste à tester dans le moteur cloud : deux créations hors ligne distinctes pour la même clé logique doivent converger sans blocage.

## 9. Sauvegarde JSON v7

La v7 :

- exporte les 30 tables utilisateur ;
- exporte `deletionRecords` ;
- exclut les quatre tables internes ;
- n’exporte aucun token ni état de session ;
- fonctionne sans dépendance cloud ;
- restaure en mode local ;
- migre automatiquement les formats v1 à v6.

Lors d’un import ancien :

- `rewardState` v4 est converti en tables Dexie ;
- `appSettings` v5 est converti en `userSettings` ;
- `deviceSettings` de l’appareil courant n’est jamais écrasé ;
- les backups antérieurs à v7 reçoivent une liste vide de `deletionRecords`.

## 10. Bilan de la phase B

### Terminé pour le prototype des pesées

- [x] inventaire des stockages régénéré ;
- [x] tables utilisateur et internes séparées ;
- [x] paramètres utilisateur/appareil séparés ;
- [x] états utilisateur persistés dans Dexie ;
- [x] complétions et états locaux des rappels séparés ;
- [x] IDs déterministes préparés ;
- [x] stratégie de suppression durable implémentée ;
- [x] backup JSON v7 validé ;
- [x] migrations Dexie v1 à v8 testées ;
- [x] migrations backup v1 à v7 testées ;
- [x] aucune dépendance cloud requise en mode local.

### À traiter avant la généralisation

- [ ] séparation fine de `foodProducts` ;
- [ ] séparation catalogue d’exercices / exercices personnalisés ;
- [ ] verrou multiappareil des séances en cours ;
- [ ] séparation propositions calculées / décisions de progression ;
- [ ] import JSON contrôlé avec synchronisation active.

Ces points ne bloquent pas le prototype limité à `weights`.

## 11. Sources de code

- `src/infrastructure/database/schema.ts`
- `src/infrastructure/database/AppDatabase.ts`
- `src/infrastructure/database/migrations/version5.ts`
- `src/infrastructure/database/migrations/version6.ts`
- `src/infrastructure/database/migrations/version7.ts`
- `src/infrastructure/database/migrations/version8.ts`
- `src/infrastructure/backup/backupService.ts`
- `src/infrastructure/backup/backupMigrations.ts`
- `src/infrastructure/user-state/userStateRuntime.ts`
- `src/infrastructure/user-state/legacyUserStateMigration.ts`
- `src/infrastructure/repositories/dexie/trashService.ts`
- `src/domain/models/deletion.ts`
