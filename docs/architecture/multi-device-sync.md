# Architecture de synchronisation multiappareil

- **Projet :** SportPilot
- **Branche de cadrage :** `docs/multi-device-sync-architecture`
- **Base auditée :** `develop` au commit `09fadf5`
- **Version applicative :** `0.16.0`
- **Date de décision :** 29 juin 2026
- **Statut :** architecture proposée, aucun code de synchronisation autorisé à ce stade

## 1. Objectif

Ajouter ultérieurement une synchronisation multiappareil sans remettre en cause les propriétés actuelles de SportPilot :

1. fonctionnement complet hors ligne ;
2. conservation locale des données dans IndexedDB ;
3. compte facultatif ;
4. sauvegarde JSON indépendante du fournisseur cloud ;
5. absence de perte silencieuse lors d’un conflit ;
6. isolation stricte des données entre utilisateurs ;
7. migration réversible depuis le mode local actuel.

Cette phase produit uniquement la documentation de référence. Elle n’installe aucune dépendance, ne modifie aucun schéma Dexie et ne contacte aucun environnement cloud.

## 2. Décision structurante

Le prototype utilisera **Dexie Cloud** comme moteur de synchronisation candidat.

Ce choix est limité au prototype. Il ne constitue pas encore un engagement de production.

La cible fonctionnelle est :

```text
Interface React
      ↓
Services applicatifs
      ↓
Repositories SportPilot
      ↓
Dexie / IndexedDB local
      ↓
dexie-cloud-addon
      ↓
Dexie Cloud
```

L’interface et les services continuent à travailler avec la base locale. La synchronisation est un comportement de l’infrastructure, pas une dépendance réseau introduite dans les pages React.

## 3. Situation actuelle

### 3.1 Base locale

`AppDatabase` contient :

- 22 tables utilisateur ;
- 3 tables internes ;
- 4 versions de schéma Dexie enregistrées ;
- un nom de base locale unique : `sportpilot-local-database`.

Les tables utilisateur sont listées dans `src/infrastructure/database/schema.ts`. Les tables internes sont :

- `migrationJournal` ;
- `databaseDiagnostics` ;
- `trashItems`.

### 3.2 Sauvegarde

Le format courant est **JSON v4**.

La sauvegarde v4 exporte les 22 tables utilisateur énumérées par `backupService.tableList()`.

Elle exporte aussi un bloc `rewardState` comprenant actuellement :

- badges ;
- thèmes visuels ;
- missions hebdomadaires ;
- objectifs ;
- planning d’endurance.

Le planning d’endurance est donc déjà couvert par le backup v4, même s’il reste stocké dans `localStorage`.

Ne sont pas exportés par le backup actuel :

- `migrationJournal` ;
- `databaseDiagnostics` ;
- `trashItems` ;
- états d’ouverture de l’interface ;
- registre d’exécution des rappels (`sportpilot:routine-reminders:v1`) ;
- données techniques du service worker et caches navigateur.

### 3.3 États hors Dexie

Plusieurs états utilisateur sont encore dans `localStorage` :

- badges ;
- thèmes de récompense ;
- historique des missions hebdomadaires ;
- objectifs ;
- planning d’endurance.

Ces cinq états sont inclus dans le backup v4 via `rewardState`, mais ne peuvent pas bénéficier directement d’une synchronisation Dexie.

Le registre des rappels contient à la fois des informations potentiellement utilisateur et des informations propres à l’appareil :

- rappel marqué terminé ;
- dernier affichage ;
- report jusqu’à une heure donnée.

Il devra être scindé avant toute synchronisation générale.

## 4. Principes obligatoires

### 4.1 Local-first

Une écriture utilisateur est validée dans IndexedDB avant toute synchronisation distante.

Le réseau ne doit pas être requis pour :

- enregistrer un repas ;
- saisir une pesée ;
- ajouter une activité ;
- modifier un objectif ;
- planifier ou terminer une séance ;
- consulter les données déjà présentes localement.

### 4.2 Compte facultatif

Deux modes sont maintenus.

#### Mode local

- aucun compte ;
- aucun transfert vers le cloud ;
- comportement actuel conservé ;
- export et restauration JSON disponibles.

#### Mode synchronisé

- authentification explicite ;
- données privées rattachées au compte ;
- synchronisation entre appareils ;
- export JSON toujours disponible ;
- indicateur d’état de synchronisation visible.

Le choix de ne pas créer de compte ne doit pas dégrader les fonctions actuelles.

### 4.3 Isolation par utilisateur

Le prototype ne met en œuvre aucune collaboration, aucun coach et aucun partage de données.

Chaque objet synchronisé appartient au domaine privé de l’utilisateur authentifié. Dexie Cloud permet d’utiliser le realm privé implicite de l’utilisateur pour ce cas simple.

Les propriétés réservées `realmId` et `owner` ne doivent être ajoutées explicitement que lorsqu’un besoin de partage est validé.

### 4.4 Repositories inchangés côté métier

Les composants React ne doivent pas importer directement l’API cloud.

L’accès aux données reste encapsulé derrière les repositories actuels. Les modifications de synchronisation sont concentrées dans :

- la construction d’`AppDatabase` ;
- le schéma ;
- les migrations ;
- les repositories ;
- un futur service de compte et d’état de synchronisation.

## 5. Modèle d’identité

### 5.1 Identifiants d’entités

Les identifiants doivent être universellement uniques entre appareils.

Avant le prototype, vérifier pour chaque table :

- la stratégie actuelle de génération d’ID ;
- l’absence d’IDs numériques auto-incrémentés ;
- la stabilité des IDs lors d’un export/import ;
- l’absence de réutilisation d’un ID après suppression.

Aucune migration ne doit réécrire massivement les IDs existants sans sauvegarde et test de restauration.

Les tables à unicité métier forte doivent adopter des IDs déterministes ou une procédure de fusion :

- pesée par date ;
- pas par date ;
- objectifs journaliers par date ;
- statut de journal par date ;
- repas par date et créneau ;
- bilan par début de semaine.

### 5.2 Identité de l’appareil

Créer ultérieurement un `deviceId` local, jamais synchronisé, utilisé pour :

- diagnostiquer une mutation ;
- gérer le verrou d’une séance en cours ;
- distinguer un rappel local ;
- afficher l’origine d’un conflit.

Le `deviceId` ne contient aucune information matérielle et n’utilise pas d’empreinte intrusive du navigateur.

### 5.3 Changement de compte

Une base locale contenant les données d’un compte ne doit jamais être réutilisée silencieusement pour un autre compte.

Deux stratégies sont acceptables pour le prototype :

1. base IndexedDB distincte par utilisateur ;
2. effacement contrôlé de la base synchronisée lors de la déconnexion, après sauvegarde locale.

La décision devra suivre le comportement réel de `db.cloud.logout()` et être validée sur iPhone, ordinateur et PWA installée.

## 6. Authentification

### 6.1 Prototype

Utiliser l’authentification email OTP fournie par Dexie Cloud.

Le prototype doit vérifier :

- premier login ;
- session persistante ;
- fonctionnement hors ligne après authentification initiale ;
- reconnexion ;
- expiration ou révocation ;
- déconnexion ;
- changement d’appareil ;
- changement de compte.

### 6.2 Production

Avant production, décider entre :

- email OTP ;
- connexion Apple ;
- connexion Google ;
- solution d’authentification personnalisée.

Aucune clé secrète ne doit être embarquée dans le bundle web.

Les fichiers de commande contenant des secrets, notamment `dexie-cloud.key`, doivent être exclus de Git.

## 7. Frontière de synchronisation

Les catégories sont définies dans [sync-data-inventory.md](./sync-data-inventory.md).

### 7.1 À synchroniser

- données métier créées ou modifiées par l’utilisateur ;
- planning ;
- journal alimentaire ;
- activités ;
- données de musculation ;
- objectifs et progression non recalculable ;
- préférences réellement liées au compte.

### 7.2 À conserver localement

- diagnostics ;
- journal de migrations ;
- persistance du navigateur ;
- cache Open Food Facts ;
- état ouvert/fermé des sections ;
- dernière page ;
- paramètres propres au matériel ;
- informations de dernière sauvegarde locale ;
- historique de dernier affichage d’un rappel.

### 7.3 À scinder

Certains objets mélangent des données utilisateur et des données d’appareil :

- `AppSettings` ;
- produits alimentaires externes et produits personnalisés ;
- catalogue d’exercices fourni et exercices personnalisés ;
- registre des rappels ;
- corbeille actuelle.

Ils ne doivent pas être synchronisés tels quels.

## 8. Préparation du schéma

Avant d’activer Dexie Cloud :

1. déplacer les états utilisateur synchronisables de `localStorage` vers des tables Dexie ;
2. séparer les préférences utilisateur des préférences d’appareil ;
3. définir la suppression synchronisée ;
4. vérifier tous les IDs ;
5. identifier les tableaux imbriqués susceptibles d’être modifiés sur plusieurs appareils ;
6. modifier les repositories pour privilégier les mises à jour partielles ;
7. ajouter des tests de migration et de restauration ;
8. faire évoluer le backup JSON vers une v5 si de nouvelles tables apparaissent.

### 8.1 Mises à jour partielles

Dexie Cloud distingue l’intention d’une mise à jour partielle de celle d’un remplacement complet.

Les repositories devront privilégier :

```ts
table.update(id, changes)
```

lorsqu’une opération ne modifie que certains champs.

Un `put()` complet peut écraser des modifications réalisées sur un autre appareil, même lorsque celles-ci concernaient d’autres propriétés.

### 8.2 Collections imbriquées

Éviter les tableaux fréquemment modifiés dans un même objet synchronisé.

Quand plusieurs éléments évoluent indépendamment, utiliser une table enfant :

```text
parent
  id

child
  id
  parentId
  sortOrder
```

Ce principe s’applique notamment aux éléments de modèles de séances, exercices d’une séance et séries.

## 9. Première connexion et migration

### 9.1 Précontrôles

Avant toute première synchronisation :

1. vérifier l’intégrité de la base ;
2. créer automatiquement un backup JSON ;
3. enregistrer la version de base et de backup ;
4. compter les enregistrements par catégorie ;
5. vérifier que le compte cible est correct ;
6. empêcher la fermeture de l’étape critique.

### 9.2 Cas autorisés

#### Cloud vide, appareil avec données

Action proposée :

> Conserver et synchroniser les données de cet appareil.

Les données locales deviennent la base initiale du compte.

#### Cloud avec données, appareil vide

Action proposée :

> Télécharger les données du compte sur cet appareil.

#### Cloud et appareil non vides

Aucune fusion implicite.

Présenter :

- nombre de données locales ;
- nombre de données distantes ;
- date de dernière activité ;
- date de dernière modification ;
- choix d’annuler ;
- fusion contrôlée ;
- remplacement local par le compte ;
- remplacement du compte par les données locales, réservé à un mode avancé.

Toute opération de remplacement crée d’abord une sauvegarde.

### 9.3 Import JSON avec synchronisation active

Pour le prototype, l’import JSON est interdit lorsque la synchronisation est active.

Pour la production, il devra devenir une opération explicite :

1. simulation ;
2. aperçu des changements ;
3. backup automatique ;
4. transaction ;
5. synchronisation ;
6. rapport final.

## 10. Suppression et corbeille

La table actuelle `trashItems` stocke une logique de récupération locale et n’est ni exportée par `backupService.tableList()` ni adaptée directement à une réplication multiappareil.

La généralisation devra choisir un modèle unique :

### Option recommandée

- `deletedAt` sur les entités récupérables ;
- métadonnées de suppression synchronisées ;
- affichage de la corbeille à partir des entités supprimées ;
- restauration par remise à `null` de `deletedAt` ;
- purge physique après une durée de rétention ;
- purge cohérente des enfants.

Le prototype sur les pesées peut exclure la corbeille, mais la généralisation ne doit pas commencer avant validation de cette stratégie.

## 11. Séance de musculation active

Une séance `inProgress` est un cas critique.

Ajouter ultérieurement :

- `activeDeviceId` ;
- `leaseUpdatedAt` ;
- durée de validité du verrou ;
- avertissement sur l’autre appareil ;
- action explicite de reprise de contrôle.

Deux appareils ne doivent jamais fusionner automatiquement :

- deux chronomètres ;
- deux états de pause ;
- deux éditions concurrentes de la même série active.

Les séries distinctes possédant des IDs différents peuvent être conservées.

## 12. Sauvegarde JSON

Le cloud ne remplace pas le backup.

Le backup doit rester :

- portable ;
- lisible hors ligne ;
- indépendant de l’authentification ;
- restaurable en mode local ;
- versionné ;
- validé par schéma ;
- utilisable pour quitter Dexie Cloud.

Une **v5** sera probablement nécessaire lors de la phase de préparation pour représenter les nouveaux états Dexie et la séparation utilisateur/appareil.

Le backup v5 ne doit pas inclure :

- tokens ;
- identifiants de session ;
- secrets ;
- `deviceId` ;
- diagnostics ;
- files d’attente techniques de synchronisation.

## 13. Sécurité et confidentialité

Conditions minimales avant production :

- HTTPS ;
- données privées par défaut ;
- contrôle d’accès vérifié côté service ;
- aucun secret dans le client ;
- révocation de session ;
- suppression de compte ;
- suppression des données cloud ;
- export complet ;
- journalisation sans données nutritionnelles en clair ;
- politique de confidentialité mise à jour ;
- documentation des sous-traitants et régions d’hébergement ;
- procédure d’incident ;
- durée de conservation documentée.

Les données de sport, poids et nutrition doivent être traitées comme des données personnelles sensibles dans la conception, même si la qualification juridique exacte dépend du contexte d’utilisation.

## 14. État de synchronisation dans l’interface

Prévoir ultérieurement un état simple :

- Local uniquement ;
- Connexion requise ;
- Synchronisé ;
- Synchronisation en cours ;
- Modifications hors ligne ;
- Erreur de synchronisation ;
- Conflit nécessitant une action.

Ne jamais afficher « Synchronisé » uniquement parce que le navigateur est connecté.

L’état doit provenir du moteur de synchronisation et de la dernière opération confirmée.

## 15. Observabilité

Enregistrer localement, sans contenu métier :

- date de dernière synchronisation réussie ;
- code d’erreur ;
- nombre d’opérations en attente ;
- durée ;
- version du schéma ;
- `deviceId` ;
- état d’authentification.

Les données d’observabilité ne sont pas synchronisées dans les tables métier.

## 16. Stratégie de tests

### 16.1 Tests automatisés

- migration depuis chaque version Dexie supportée ;
- migration backup v1 à v5 ;
- repositories en mode local ;
- repositories avec addon ;
- création hors ligne ;
- modification hors ligne ;
- suppression hors ligne ;
- conflits déterministes ;
- changement de compte ;
- restauration JSON ;
- absence de fuite entre comptes.

### 16.2 Matrice manuelle

Appareils minimaux :

- iPhone 15 sous iOS 26, PWA installée ;
- navigateur ordinateur ;
- second profil navigateur ou autre appareil.

Scénarios :

1. créer sur téléphone, lire sur ordinateur ;
2. créer hors ligne sur téléphone, reconnecter ;
3. modifier des champs différents sur deux appareils ;
4. modifier le même champ ;
5. supprimer sur un appareil et modifier sur l’autre ;
6. commencer une séance sur deux appareils ;
7. se déconnecter ;
8. changer de compte ;
9. supprimer le compte ;
10. exporter puis restaurer en mode local.

## 17. Découpage d’exécution

### Phase A — Documentation

Branche actuelle.

Livrables :

- ce document ;
- inventaire des données ;
- matrice de conflits ;
- ADR fournisseur.

Aucun code.

### Phase B — Préparation locale

Branche future proposée :

```text
feature/sync-data-readiness
```

Périmètre :

- tables Dexie pour les états utilisateur hors base ;
- séparation des paramètres d’appareil ;
- stratégie de suppression ;
- IDs déterministes ;
- backup v5 ;
- migrations et tests.

Aucune connexion cloud.

### Phase C — Prototype pesées

Branche future proposée :

```text
experiment/dexie-cloud-weight-sync
```

Périmètre :

- environnement Dexie Cloud de test ;
- authentification OTP ;
- synchronisation de la table de pesées seulement ;
- données fictives ;
- mode hors ligne ;
- conflits ;
- suppression ;
- retour arrière documenté.

### Phase D — Généralisation

Uniquement après validation du prototype :

- migration progressive table par table ;
- écran de compte ;
- état de synchronisation ;
- reprise sur erreur ;
- stratégie de corbeille ;
- données réelles après validation explicite.

## 18. Critères de passage à la phase B

Tous les points suivants doivent être approuvés :

- [ ] Dexie Cloud retenu pour le prototype ;
- [ ] compte facultatif ;
- [ ] données privées uniquement ;
- [ ] backup JSON maintenu ;
- [ ] stratégie de changement de compte ;
- [ ] stratégie de suppression ;
- [ ] scission `AppSettings` ;
- [ ] migration des états `localStorage` ;
- [ ] matrice de conflits validée ;
- [ ] aucune donnée réelle dans le prototype ;
- [ ] coûts et conditions du fournisseur vérifiés ;
- [ ] possibilité de sortie du fournisseur documentée.

## 19. Références

### Code SportPilot

- `src/infrastructure/database/AppDatabase.ts`
- `src/infrastructure/database/schema.ts`
- `src/infrastructure/backup/backupService.ts`
- `src/infrastructure/backup/backupMigrations.ts`
- `src/infrastructure/backup/backupSchemas.ts`
- `src/infrastructure/backup/rewardBackupState.ts`
- `src/domain/models/backup.ts`
- `src/domain/models/settings.ts`
- `src/domain/goals/goalState.ts`
- `src/domain/planning/endurancePlanningState.ts`
- `src/domain/rewards/achievements.ts`
- `src/domain/rewards/visualThemes.ts`
- `src/domain/rewards/weeklyMissionHistory.ts`
- `src/application/reminders/routineReminderService.ts`

### Documentation fournisseur

- https://dexie.org/docs/cloud/index
- https://dexie.org/docs/Tutorial/Dexie-Cloud
- https://dexie.org/docs/cloud/access-control
- https://dexie.org/docs/cloud/authentication
- https://dexie.org/docs/cloud/consistency
