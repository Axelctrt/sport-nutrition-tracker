# Architecture de synchronisation multiappareil

- **Projet :** SportPilot
- **Décision initiale :** 29 juin 2026
- **Base de clôture de la préparation locale :** `feature/sync-data-readiness` au commit `33eb416`
- **Version applicative :** `0.16.0`
- **État local :** Dexie v8, sauvegarde JSON v7
- **Statut :** phase B terminée ; C0 prépare un prototype isolé sur les pesées, encore sans base distante

## 1. Objectif

Ajouter une synchronisation multiappareil sans remettre en cause les propriétés historiques de SportPilot :

1. fonctionnement complet hors ligne ;
2. conservation locale des données dans IndexedDB ;
3. compte facultatif ;
4. sauvegarde JSON indépendante du fournisseur cloud ;
5. absence de perte silencieuse lors d’un conflit ;
6. isolation stricte des données entre utilisateurs ;
7. migration réversible depuis le mode local.

La préparation locale est désormais terminée. Elle n’a ajouté ni compte, ni dépendance cloud, ni trafic réseau.

## 2. Décision structurante

Le prototype utilisera **Dexie Cloud** comme moteur de synchronisation candidat.

Ce choix reste limité à un environnement expérimental. Il ne constitue pas un engagement de production.

```text
Interface React
      ↓
Services applicatifs
      ↓
Repositories SportPilot
      ↓
Dexie / IndexedDB local
      ↓
dexie-cloud-addon — phase C uniquement
      ↓
Dexie Cloud — environnement de test
```

Les pages React continuent à lire et écrire dans la base locale. Le réseau ne devient jamais la source primaire d’une opération utilisateur.

## 3. État réel après la phase B

### 3.1 Base locale

`AppDatabase` enregistre huit versions Dexie immuables.

Le schéma v8 contient :

- **30 tables utilisateur**, candidates à la sauvegarde et, selon leur domaine, à une synchronisation future ;
- **4 tables internes locales** ;
- un nom de base inchangé : `sportpilot-local-database`.

Tables internes :

- `deviceSettings` ;
- `migrationJournal` ;
- `databaseDiagnostics` ;
- `trashItems`.

Les tables internes ne sont ni exportées dans le backup utilisateur ni destinées à la synchronisation.

### 3.2 États utilisateur normalisés

Les états utilisateur autrefois conservés principalement dans `localStorage` sont désormais représentés dans Dexie :

- `goals` ;
- `endurancePlanningSessions` ;
- `earnedAchievements` ;
- `unlockedVisualThemes` ;
- `visualThemePreferences` ;
- `weeklyMissionCompletions` ;
- `routineReminderCompletions`.

Les anciennes clés `localStorage` restent uniquement utilisées par la migration héritée et comme snapshot local de secours si une écriture Dexie échoue. En fonctionnement normal, Dexie est la source persistante.

### 3.3 Paramètres utilisateur et appareil

L’ancien singleton `appSettings` a été séparé en Dexie v7 :

- `userSettings` : paramètres liés à l’utilisateur, exportés et futurs candidats à la synchronisation ;
- `deviceSettings` : paramètres propres à l’installation, non exportés et non synchronisés.

`deviceSettings` contient notamment :

- `deviceId` ;
- thème clair/sombre/système ;
- demande de stockage persistant ;
- réglages locaux du minuteur ;
- métadonnées des sauvegardes effectuées sur l’appareil.

La clé `sport-pilot.theme` reste un cache de démarrage local pour éviter un flash de thème avant l’ouverture de Dexie.

### 3.4 Suppressions

Dexie v8 introduit `deletionRecords`.

```text
delection:<entityType>:<entityId>
  entityType
  entityId
  status = deleted | restored
  deletedAt
  restoredAt éventuel
  updatedAt
```

La suppression combine dans une même transaction :

1. création d’un snapshot local dans `trashItems` ;
2. création ou mise à jour du `deletionRecord` ;
3. suppression physique de l’entité active.

La restauration combine :

1. restauration du snapshot ;
2. passage du marqueur à `restored` avec une révision plus récente ;
3. suppression du snapshot local.

Pour les parents pris en charge, les enfants reçoivent aussi un marqueur :

- repas et entrées alimentaires ;
- recette et ingrédients ;
- exercice de séance et séries.

`trashItems` peut expirer après 30 jours. `deletionRecords` est conservé afin qu’un appareil ancien ne réintroduise pas silencieusement un objet supprimé.

### 3.5 Sauvegarde

Le format courant est **JSON v7**.

Il exporte les 30 tables utilisateur, dont :

- `userSettings` ;
- les sept groupes d’états utilisateur migrés vers Dexie ;
- `deletionRecords`.

Il exclut :

- `deviceSettings` ;
- `migrationJournal` ;
- `databaseDiagnostics` ;
- `trashItems` ;
- caches et états d’interface ;
- secrets et sessions d’authentification.

Les sauvegardes v1 à v6 restent importables grâce à la chaîne de migrations vers la v7.

## 4. Principes obligatoires

### 4.1 Local-first

Une opération utilisateur est d’abord validée dans IndexedDB.

Le réseau ne doit pas être requis pour :

- enregistrer un repas ;
- saisir une pesée ;
- ajouter une activité ;
- modifier un objectif ;
- planifier ou terminer une séance ;
- consulter les données déjà téléchargées.

### 4.2 Compte facultatif

#### Mode local

- aucun compte ;
- aucun transfert cloud ;
- toutes les fonctions actuelles conservées ;
- sauvegarde et restauration JSON disponibles.

#### Mode synchronisé

- authentification explicite ;
- données privées rattachées au compte ;
- synchronisation entre appareils ;
- sauvegarde JSON toujours disponible ;
- état de synchronisation visible et fiable.

### 4.3 Isolation par utilisateur

Le prototype ne met en œuvre ni collaboration, ni coach, ni partage.

Chaque objet synchronisé appartient au domaine privé de l’utilisateur authentifié. Toute extension à un partage multi-utilisateur nécessitera une nouvelle décision d’architecture.

### 4.4 Encapsulation

Les composants React ne doivent pas importer directement l’API cloud.

La synchronisation doit rester concentrée dans :

- la construction de la base ;
- le schéma ;
- les migrations ;
- les repositories ;
- un service dédié au compte et à l’état de synchronisation.

## 5. Identité et unicités

Les identifiants ont été préparés pour éviter les collisions entre appareils.

Les domaines à unicité métier forte utilisent un ID constant ou déterministe, notamment :

- profil ;
- paramètres utilisateur ;
- pesée par date ;
- pas par date ;
- objectifs journaliers par date ;
- statut de journal par date ;
- repas par date et créneau ;
- bilan hebdomadaire par début de semaine ;
- badges et missions.

Le `deviceId` est généré localement. Il ne contient aucune empreinte matérielle et ne doit jamais être synchronisé.

## 6. Frontière de synchronisation

La classification détaillée est tenue dans [sync-data-inventory.md](./sync-data-inventory.md).

### À synchroniser progressivement

- données métier créées ou modifiées par l’utilisateur ;
- planning ;
- journal alimentaire ;
- activités ;
- données de musculation ;
- objectifs ;
- récompenses et décisions non recalculables ;
- paramètres réellement liés au compte ;
- marqueurs `deletionRecords`.

### À conserver localement

- `deviceSettings` ;
- snapshots `trashItems` ;
- diagnostics ;
- journal des migrations ;
- caches Open Food Facts ;
- états d’ouverture de l’interface ;
- recherches récentes ;
- historique d’affichage et report local des rappels ;
- service worker et caches PWA.

### À auditer avant généralisation

La phase B rend le prototype des pesées possible, mais ne dispense pas d’un audit table par table avant la phase D :

- séparation des produits personnels et du cache Open Food Facts ;
- distinction catalogue d’exercices fourni / exercices personnalisés ;
- verrou d’une séance `inProgress` ;
- statut des suggestions recalculables ;
- import JSON avec synchronisation active.

## 7. Conflits et écritures

Les repositories privilégient les mises à jour partielles lorsque l’intention ne porte que sur certains champs.

```ts
await table.update(id, changes);
```

Un remplacement complet par `put()` reste réservé à une intention explicite.

Les règles métier détaillées sont décrites dans [sync-conflict-matrix.md](./sync-conflict-matrix.md).

Principes :

- IDs différents : conserver les deux créations ;
- même objet, champs différents : fusion propriété par propriété si le moteur le permet ;
- même champ : dernière opération causale, avec trace pour les domaines critiques ;
- suppression contre modification : `deleted` gagne ;
- restauration explicite : révision `restored` plus récente ;
- parent supprimé : enfants supprimés ou rejetés selon la transaction métier.

`updatedAt` ne doit pas être l’unique mécanisme de causalité, car l’horloge d’un appareil peut être incorrecte.

## 8. Première connexion

Avant la première synchronisation :

1. vérifier l’intégrité de la base ;
2. créer un backup JSON automatique ;
3. enregistrer les versions Dexie et backup ;
4. compter les données locales ;
5. confirmer le compte cible ;
6. empêcher une fermeture pendant une opération de remplacement.

Cas autorisés :

- cloud vide + appareil non vide : conserver et téléverser les données de l’appareil ;
- cloud non vide + appareil vide : télécharger les données du compte ;
- cloud et appareil non vides : aucune fusion implicite, aperçu et choix explicite.

Pendant le prototype, l’import JSON est interdit lorsque la synchronisation est active.

## 9. Séance de musculation active

Une séance `inProgress` reste un cas bloquant pour la généralisation.

Le modèle cible devra prévoir :

```text
activeDeviceId
leaseUpdatedAt
durée de validité
reprise explicite
```

Deux appareils ne doivent jamais fusionner automatiquement deux minuteurs, deux états de pause ou deux éditions concurrentes de la même série active.

## 10. Sécurité et confidentialité

Conditions minimales avant production :

- HTTPS ;
- données privées par défaut ;
- contrôle d’accès vérifié côté fournisseur ;
- aucun secret dans le bundle ;
- révocation des sessions ;
- suppression du compte et des données cloud ;
- export complet ;
- journalisation sans contenu sportif ou nutritionnel ;
- politique de confidentialité ;
- région d’hébergement et sous-traitants documentés ;
- procédure d’incident et durée de conservation.

Le cloud ne remplace jamais la sauvegarde JSON.

## 11. Phase C — prototype isolé sur les pesées

Branche proposée :

```text
experiment/dexie-cloud-weight-sync
```

Périmètre strict :

- environnement Dexie Cloud de test ;
- base IndexedDB expérimentale distincte de la base locale réelle ;
- authentification email OTP ;
- schéma expérimental limité à `weights` et aux marqueurs de suppression nécessaires ;
- données fictives uniquement ;
- fonctionnement hors ligne ;
- collision de deux pesées sur la même date ;
- suppression via `deletionRecords` ;
- isolation entre deux comptes ;
- déconnexion et retour au mode local ;
- procédure de retrait complet du prototype.

La phase C ne doit pas modifier silencieusement la base de production ni généraliser l’addon aux autres domaines.

## 12. Critères d’entrée en phase C

### Validés par la phase B

- [x] IDs déterministes ou universels préparés ;
- [x] repositories principaux convertis aux mises à jour partielles lorsque pertinent ;
- [x] objectifs et planning migrés vers Dexie v5 ;
- [x] récompenses et complétions de rappels migrées vers Dexie v6 ;
- [x] paramètres utilisateur et appareil séparés en Dexie v7 ;
- [x] `deviceId` local créé ;
- [x] suppressions représentées par `deletionRecords` en Dexie v8 ;
- [x] backup JSON v7 indépendant du cloud ;
- [x] backups v1 à v6 importables ;
- [x] migrations et restaurations couvertes par les tests ;
- [x] aucune dépendance cloud dans le mode local.

### À valider au démarrage de la phase C

- [x] conditions techniques et offre de prototype revérifiées le 29 juin 2026 ;
- [ ] projet Dexie Cloud expérimental créé ;
- [x] secrets et fichiers locaux exclus de Git ;
- [x] seconde base IndexedDB isolée et suffixée par environnement distant ;
- [x] procédure de rollback documentée avant le premier essai ;
- [x] données strictement fictives imposées par le périmètre ;
- [ ] origines locale et Cloudflare Tunnel autorisées après création distante.

Le bilan détaillé de la préparation locale est disponible dans [sync-phase-b-readiness.md](./sync-phase-b-readiness.md).
La préparation C0 et son rollback sont décrits dans [dexie-cloud-prototype-c0.md](./dexie-cloud-prototype-c0.md) et [dexie-cloud-prototype-rollback.md](./dexie-cloud-prototype-rollback.md).

## 13. Références de code

- `src/infrastructure/database/AppDatabase.ts`
- `src/infrastructure/database/schema.ts`
- `src/infrastructure/database/migrations/versions.ts`
- `src/infrastructure/database/migrations/version5.ts`
- `src/infrastructure/database/migrations/version6.ts`
- `src/infrastructure/database/migrations/version7.ts`
- `src/infrastructure/database/migrations/version8.ts`
- `src/infrastructure/backup/backupService.ts`
- `src/infrastructure/backup/backupMigrations.ts`
- `src/infrastructure/backup/backupSchemas.ts`
- `src/infrastructure/user-state/userStateRuntime.ts`
- `src/infrastructure/user-state/legacyUserStateMigration.ts`
- `src/infrastructure/repositories/dexie/trashService.ts`
- `src/domain/models/deletion.ts`
