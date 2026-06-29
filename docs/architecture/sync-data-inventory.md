# Inventaire des données pour la synchronisation

- **Projet :** SportPilot
- **Base :** `develop` au commit `09fadf5`
- **Date :** 29 juin 2026
- **Objet :** classifier chaque stockage avant le prototype multiappareil

## 1. Légende

| Classe | Signification |
|---|---|
| Synchroniser | Donnée métier utilisateur à répliquer |
| Local | Donnée propre à l’appareil ou recalculable |
| Scinder | L’objet mélange plusieurs responsabilités |
| Migrer | État utilisateur hors Dexie à déplacer avant synchronisation |
| À décider | Sémantique insuffisante pour une décision définitive |

## 2. Tables Dexie utilisateur

Le schéma courant déclare 22 tables utilisateur.

| Table | Contenu | Backup v4 | Cible | Politique initiale | Préparation nécessaire |
|---|---|---:|---|---|---|
| `userProfile` | Profil utilisateur | Oui | Synchroniser | Singleton, mise à jour champ par champ | ID singleton stable ; séparer tout champ propre à l’appareil |
| `appSettings` | Réglages globaux et locaux | Oui | Scinder | Voir section dédiée | Créer réglages utilisateur et réglages appareil |
| `weights` | Pesées datées | Oui | Synchroniser | Une pesée logique par date | ID déterministe ou fusion sur `date` |
| `dailySteps` | Pas journaliers | Oui | Synchroniser | Une valeur logique par date | ID déterministe ; règle max/remplacement à valider |
| `activities` | Activités d’endurance et autres | Oui | Synchroniser | Entités indépendantes | IDs universels ; suppression récupérable |
| `foodProducts` | Produits utilisés dans le journal | Oui | Scinder | Données utilisateur oui, cache externe non | Distinguer produit personnel, favori et cache Open Food Facts |
| `meals` | Repas par date et créneau | Oui | Synchroniser | Un repas par `[date+slot]` | ID déterministe ou upsert atomique |
| `foodEntries` | Lignes alimentaires | Oui | Synchroniser | Entités indépendantes | Conserver les références produit/repas |
| `favoriteMeals` | Repas favoris | Oui | Synchroniser | Mise à jour partielle | Enfants éventuels en lignes séparées |
| `recipes` | Recettes | Oui | Synchroniser | Mise à jour partielle | Suppression cohérente avec ingrédients |
| `recipeIngredients` | Ingrédients de recettes | Oui | Synchroniser | Entités enfants | Conflit d’ordre résolu par `sortOrder`, puis ID |
| `dailyTargets` | Objectifs nutritionnels journaliers | Oui | Synchroniser | Une valeur logique par date | ID déterministe |
| `dailyJournalStatuses` | Statut de complétion du journal | Oui | Synchroniser | Une valeur par date | ID déterministe |
| `weeklyReviews` | Bilans hebdomadaires | Oui | Synchroniser | Une valeur par `weekStart` | ID déterministe ; décisions utilisateur prioritaires |
| `acceptedCalorieAdjustments` | Ajustements caloriques acceptés | Oui | Synchroniser | Historique métier | Vérifier unicité et période d’effet |
| `exerciseDefinitions` | Catalogue d’exercices | Oui | Scinder | Exercices personnels oui ; catalogue fourni local/public | Marquer explicitement la provenance |
| `workoutTemplates` | Modèles de musculation | Oui | Synchroniser | Entités parents | Mise à jour partielle |
| `workoutTemplateExercises` | Exercices des modèles | Oui | Synchroniser | Entités enfants | Ordre stable et suppression en cascade |
| `workoutSessions` | Séances de musculation | Oui | Synchroniser | Règle spéciale pour `inProgress` | Verrou d’appareil et stratégie de reprise |
| `workoutSessionExercises` | Exercices d’une séance | Oui | Synchroniser | Entités enfants | Éviter remplacement complet |
| `strengthSets` | Séries de musculation | Oui | Synchroniser | Ajouts indépendants | IDs universels ; même série = champ par champ |
| `progressionSuggestions` | Suggestions de progression | Oui | À décider | Synchroniser les décisions, recalculer les propositions | Distinguer donnée dérivée et action utilisateur |

## 3. Tables internes

| Table | Contenu | Backup v4 | Cible | Justification |
|---|---|---:|---|---|
| `migrationJournal` | Historique de migration locale | Non | Local | Dépend de la base et du navigateur |
| `databaseDiagnostics` | Rapports d’intégrité | Non | Local | Diagnostic technique et recalculable |
| `trashItems` | Snapshots de corbeille | Non | Scinder / redessiner | Format local incompatible avec une suppression synchronisée durable |

`trashItems` ne doit pas être ajouté tel quel à la synchronisation. La cible recommandée est un modèle `deletedAt` avec restauration, puis purge.

## 4. Détail d’`AppSettings`

La table contient actuellement des réglages utilisateur et des états d’appareil.

### 4.1 À synchroniser

Sous réserve de validation UX :

- paramètres de calcul nutritionnel et sportif ;
- plafonds d’ajustement ;
- modèles d’endurance ;
- personnalisation du tableau de bord ;
- planning des rappels et heures silencieuses ;
- intervalle souhaité de rappel de sauvegarde, si considéré comme une préférence utilisateur.

### 4.2 À conserver localement

- `requestPersistentStorage` ;
- `lastBackupExportedAt` ;
- `lastBackupAppVersion` ;
- `lastBackupSchemaVersion` ;
- capacité vibration/son ;
- dernier état du minuteur ;
- tout état de permission navigateur.

### 4.3 À trancher par UX

- `theme` clair/sombre/système : recommandé local par appareil ;
- démarrage automatique du minuteur : peut être utilisateur ou appareil ;
- son et vibration du minuteur : recommandé local ;
- thème visuel de récompense actif : recommandé synchronisé ;
- état ouvert/fermé des sections : local.

### 4.4 Modèle cible

```text
userSettings
  id
  updatedAt
  paramètres de calcul
  dashboardPreferences
  enduranceTemplates
  routineReminderPreferences

deviceSettings
  id local
  deviceId
  themePreference
  persistentStorage
  timerSound
  timerVibration
  backupMetadata
```

`deviceSettings` n’est pas exporté dans le backup utilisateur, sauf choix explicite ultérieur.

## 5. États `localStorage` utilisateur vérifiés

### 5.1 État exporté par le backup v4

| Clé | Contenu | Backup v4 | Cible |
|---|---|---:|---|
| `sport-pilot.achievements` | Badges débloqués | Oui | Migrer vers Dexie et synchroniser |
| `sport-pilot.reward-themes` | Thèmes débloqués et thème actif | Oui | Migrer vers Dexie et synchroniser |
| `sport-pilot.weekly-mission-history` | Semaines de mission terminées | Oui | Migrer vers Dexie et synchroniser |
| `sportpilot:goals:v1` | Objectifs personnels | Oui | Migrer vers Dexie et synchroniser |
| `sportpilot:endurance-planning:v1` | Séances d’endurance planifiées | Oui | Migrer vers Dexie et synchroniser |

Ces états sont lus et restaurés par `rewardBackupState.ts`.

### 5.2 Registre des rappels

| Clé | Contenu | Backup v4 | Cible |
|---|---|---:|---|
| `sportpilot:routine-reminders:v1` | Terminé, dernier affichage, report par jour/type | Non | Scinder |

Modèle cible recommandé :

```text
routineReminderCompletion
  id = date + type
  date
  type
  completedAt
  updatedAt
```

Synchronisé.

```text
deviceReminderLedger
  deviceId
  date
  type
  lastShownAt
  snoozedUntil
```

Local.

Ainsi, « terminé » peut s’appliquer au compte, tandis que l’affichage et le report restent propres à l’appareil.

### 5.3 État d’interface

`CollapsibleSection` peut enregistrer des clés libres via sa propriété `storageKey`.

Exemples vérifiés dans la phase d’analyses :

- `sportpilot:analytics:planning-adherence` ;
- `sportpilot:analytics:personal-records`.

Classification : **local uniquement**.

Ces valeurs ne doivent ni être sauvegardées ni synchronisées.

## 6. Recherche obligatoire avant la phase B

L’inventaire des clés de stockage doit être régénéré depuis la branche au moment de coder.

Commande PowerShell :

```powershell
Get-ChildItem .\src -Recurse -File |
  Select-String -Pattern 'localStorage|sessionStorage|storageKey' |
  Select-Object Path, LineNumber, Line
```

Puis rechercher les constantes :

```powershell
Get-ChildItem .\src -Recurse -File |
  Select-String -Pattern 'STORAGE_KEY|storageKey=' |
  Select-Object Path, LineNumber, Line
```

Aucune clé découverte ne doit être migrée automatiquement sans classification.

## 7. Données externes et caches

### 7.1 Open Food Facts

Ne pas synchroniser comme données utilisateur :

- réponses de recherche ;
- caches temporaires ;
- diagnostics réseau ;
- données récupérables depuis l’API.

Synchroniser uniquement lorsque l’utilisateur a créé une donnée durable :

- produit personnalisé ;
- correction personnelle ;
- favori ;
- référence utilisée par une entrée alimentaire, si nécessaire pour l’intégrité hors ligne.

Le modèle actuel `foodProducts` devra distinguer ces cas.

### 7.2 Catalogue d’exercices

Le catalogue fourni par SportPilot doit rester :

- livré avec l’application ;
- migré par le seeder ;
- ou placé dans un realm public en lecture seule si le prototype le justifie.

Les exercices ajoutés ou personnalisés par l’utilisateur sont synchronisés.

## 8. Données dérivées

Ne pas synchroniser un résultat recalculable lorsque sa source est déjà synchronisée, sauf besoin métier clair.

Candidats à recalculer :

- analyses sur 12 semaines ;
- records personnels ;
- adhérence au planning ;
- tendances ;
- recommandations purement calculées ;
- diagnostics ;
- agrégats de tableau de bord.

Candidats à synchroniser :

- acceptation d’une recommandation ;
- statut d’un objectif ;
- bilan validé ;
- décision utilisateur ;
- historique nécessaire à une récompense.

## 9. Métadonnées minimales

Chaque entité synchronisée doit posséder ou obtenir :

```text
id
createdAt
updatedAt
deletedAt éventuel
```

Selon le domaine :

```text
owner éventuel
realmId éventuel
createdByDeviceId éventuel
updatedByDeviceId éventuel
```

Les timestamps métier ne doivent pas être l’unique mécanisme de résolution des conflits. Le moteur de synchronisation garde sa propre causalité.

## 10. Unicités métier à traiter avant sync

| Domaine | Unicité actuelle | Risque multiappareil | Cible |
|---|---|---|---|
| Pesée | `date` unique | Deux IDs créés hors ligne pour la même date | ID déterministe par date |
| Pas | `date` unique | Collision à la reconnexion | ID déterministe par date |
| Repas | `[date+slot]` unique | Double création hors ligne | ID déterministe date+slot |
| Objectif journalier | `date` unique | Collision | ID déterministe |
| Statut journal | `date` unique | Collision | ID déterministe |
| Bilan hebdomadaire | `weekStart` unique | Double bilan | ID déterministe par semaine |
| Profil | Un seul enregistrement | Deux singletons | ID constant |
| Réglages utilisateur | Un seul enregistrement | Deux singletons | ID constant |
| Mission hebdomadaire | `weekStart` | Doublon | Clé par semaine |
| Badge | `achievementId` | Doublon | Clé par badge |

## 11. Backup v5 proposé

Le passage à une v5 devient nécessaire si les états `localStorage` sont convertis en tables.

Le backup v5 devra :

- exporter toutes les tables utilisateur synchronisables ;
- exclure `deviceSettings` ;
- exclure tokens et état du moteur cloud ;
- inclure les données de corbeille si la restauration multiappareil est validée ;
- migrer automatiquement les backups v1 à v4 ;
- restaurer en mode local sans compte ;
- fonctionner sans dépendance à Dexie Cloud.

## 12. Checklist de fin de phase B

- [ ] inventaire des stockages régénéré ;
- [ ] chaque table classifiée ;
- [ ] chaque champ d’`AppSettings` classifié ;
- [ ] catalogue externe séparé des données utilisateur ;
- [ ] catalogue d’exercices fourni séparé des ajouts utilisateur ;
- [ ] états utilisateur sortis de `localStorage` ;
- [ ] registre des rappels scindé ;
- [ ] IDs et unicités vérifiés ;
- [ ] suppression définie ;
- [ ] backup v5 validé ;
- [ ] migrations testées ;
- [ ] aucune dépendance cloud requise pour le mode local.

## 13. Sources de code

- `src/infrastructure/database/AppDatabase.ts`
- `src/infrastructure/database/schema.ts`
- `src/infrastructure/backup/backupService.ts`
- `src/infrastructure/backup/rewardBackupState.ts`
- `src/domain/models/backup.ts`
- `src/domain/models/settings.ts`
- `src/domain/goals/goalState.ts`
- `src/domain/planning/endurancePlanningState.ts`
- `src/domain/rewards/achievements.ts`
- `src/domain/rewards/visualThemes.ts`
- `src/domain/rewards/weeklyMissionHistory.ts`
- `src/application/reminders/routineReminderService.ts`
- `src/shared/ui/CollapsibleSection.tsx`
