# Matrice de conflits de synchronisation

- **Projet :** SportPilot
- **Fournisseur candidat :** Dexie Cloud
- **Date :** 29 juin 2026
- **Portée :** règles métier à appliquer avant généralisation

## 1. Principes

1. Une création ne doit jamais écraser une autre création portant un ID différent.
2. Une mise à jour partielle doit utiliser `update()` lorsque possible.
3. Un remplacement complet par `put()` est réservé à une intention explicite.
4. Les données critiques ne sont pas résolues uniquement par `updatedAt`.
5. Les suppressions récupérables utilisent `deletedAt`.
6. Les tableaux fréquemment modifiés sont normalisés en lignes enfants.
7. Les contraintes d’unicité métier utilisent des IDs déterministes ou une fusion.
8. Toute résolution automatique doit être testée hors ligne sur deux appareils.

## 2. Niveaux de traitement

| Niveau | Traitement |
|---|---|
| Automatique | Résultat déterministe sans perte significative |
| Automatique avec trace | Résultat déterministe et conflit enregistré |
| Interaction utilisateur | Choix nécessaire |
| Blocage | Opération refusée jusqu’à résolution |

## 3. Matrice générale

| Scénario | Exemple | Décision | Niveau |
|---|---|---|---|
| Créations avec IDs différents | Deux activités ajoutées hors ligne | Conserver les deux | Automatique |
| Mise à jour de champs différents | Titre modifié sur A, notes sur B | Fusion propriété par propriété | Automatique |
| Mise à jour du même champ | Même note modifiée sur A et B | Dernière opération confirmée par le moteur | Automatique avec trace pour données critiques |
| `put()` concurrent | Objet entier remplacé sur A et B | Dernière opération remplace l’objet | À éviter par conception |
| Suppression puis modification | A supprime, B modifie hors ligne | Suppression gagnante, sauf restauration explicite | Automatique avec trace |
| Modification puis restauration | A modifie, B restaure de la corbeille | Restauration crée une nouvelle révision | Interaction si contenu divergent |
| Suppression parent / ajout enfant | Recette supprimée, ingrédient ajouté | Parent supprimé ; enfant supprimé ou orphelin rejeté | Automatique |
| Deux créations sur une clé métier unique | Deux pesées le même jour | Fusion sur clé déterministe | Automatique avec règle domaine |
| Import JSON pendant sync | Import massif sur un appareil | Interdit dans le prototype | Blocage |
| Changement de compte | Base locale déjà liée à un autre compte | Sauvegarde puis base séparée/effacée | Blocage tant que non confirmé |
| Horloge locale erronée | Appareil décalé de plusieurs heures | Ne pas utiliser seul `updatedAt` métier | Automatique via moteur |

## 4. Règles par domaine

### 4.1 Profil utilisateur

| Conflit | Règle |
|---|---|
| Champs distincts | Fusion partielle |
| Même champ | Dernière opération |
| Profil local et cloud différents au premier login | Aperçu et choix explicite |
| Suppression du profil | Équivalent à suppression de compte, jamais automatique |

Le profil possède un ID constant.

### 4.2 Réglages

Les réglages sont séparés avant synchronisation.

#### Réglages utilisateur

- fusion champ par champ ;
- dernière opération sur un même champ ;
- paramètres numériques validés après fusion ;
- valeurs hors bornes rejetées.

#### Réglages appareil

- aucun conflit distant ;
- restent dans la base locale ou `localStorage`.

### 4.3 Pesées

Clé logique :

```text
weight:<YYYY-MM-DD>
```

| Scénario | Règle |
|---|---|
| Deux pesées différentes le même jour | Dernière saisie par défaut ; conserver l’ancienne dans une trace locale pendant le prototype |
| Modification de note et poids séparément | Fusion partielle |
| Suppression sur A, modification sur B | Suppression gagnante |
| Import d’un backup contenant la date | Simulation et choix avant remplacement |

Le prototype Dexie Cloud doit utiliser ce domaine car il est simple mais expose les collisions de date.

### 4.4 Pas journaliers

Clé logique :

```text
steps:<YYYY-MM-DD>
```

Règle initiale :

- une saisie manuelle remplace la valeur précédente ;
- ne pas prendre automatiquement le maximum sans connaître la provenance ;
- si une future source automatique est ajoutée, séparer les contributions par source.

### 4.5 Activités

| Scénario | Règle |
|---|---|
| Deux activités distinctes | Conserver les deux |
| Même activité, champs distincts | Fusion partielle |
| Même distance/durée modifiée | Dernière opération avec trace |
| Suppression / modification | Suppression gagnante |
| Doublon probable après import | Signaler, ne pas dédupliquer silencieusement |

Une détection de doublon peut suggérer une action sans fusion automatique.

### 4.6 Nutrition

#### Repas

Clé logique :

```text
meal:<YYYY-MM-DD>:<slot>
```

Deux créations sur le même créneau fusionnent leurs entrées si les IDs d’entrées sont distincts.

#### Entrées alimentaires

- IDs distincts : conserver ;
- même ID : mise à jour partielle ;
- suppression du repas : supprimer ou détacher les entrées dans la même intention transactionnelle ;
- produit manquant : conserver un snapshot nutritionnel suffisant pour l’historique.

#### Produits

- cache Open Food Facts local ;
- produit personnalisé synchronisé ;
- favori synchronisé ;
- correction personnelle prioritaire sur le cache externe ;
- mise à jour externe ne doit pas écraser une correction personnelle.

### 4.7 Recettes et favoris

Les ingrédients sont des lignes enfants.

| Conflit | Règle |
|---|---|
| Deux ingrédients ajoutés | Conserver les deux |
| Même ingrédient modifié | Mise à jour partielle |
| Même `sortOrder` | Trier par `sortOrder`, puis ID |
| Recette supprimée / ingrédient ajouté | Suppression parent gagnante |
| Recette renommée / ingrédient ajouté | Fusion |

### 4.8 Objectifs journaliers et statut de journal

IDs déterministes par date.

- modification de champs distincts : fusion ;
- même champ : dernière opération ;
- statut « terminé » puis modification des entrées : le statut reste une action utilisateur, mais l’interface peut signaler que le journal a changé après validation.

### 4.9 Bilans hebdomadaires

Clé logique :

```text
weekly-review:<weekStart>
```

- un seul bilan par semaine ;
- génération automatique sur deux appareils : conserver une version canonique ;
- décision utilisateur acceptée : ne pas l’écraser par un recalcul silencieux ;
- nouvelle génération : créer une révision ou demander confirmation.

### 4.10 Ajustements caloriques

Les ajustements acceptés sont un historique métier.

- deux ajustements sur une période qui se chevauche : interaction utilisateur ;
- un ajustement annulé et un autre créé : conserver l’historique ;
- ne pas recalculer silencieusement une décision déjà acceptée.

### 4.11 Catalogue d’exercices

- catalogue fourni : immuable pour l’utilisateur ou versionné par l’application ;
- exercice personnalisé : synchronisé ;
- exercice fourni renommé localement : créer une personnalisation, ne pas modifier la référence globale ;
- même exercice personnalisé modifié : fusion partielle.

### 4.12 Modèles de musculation

Parents et enfants séparés.

- exercices ajoutés avec IDs différents : conserver ;
- même position : ordre par `sortOrder`, puis ID ;
- suppression d’un modèle : supprimer les lignes enfants ;
- séance déjà créée depuis un modèle : ne pas réécrire rétroactivement la séance.

### 4.13 Séance en cours

État cible :

```text
status
activeDeviceId
leaseUpdatedAt
```

| Scénario | Règle |
|---|---|
| A démarre, B ouvre | B en lecture seule avec avertissement |
| Bail expiré | B peut reprendre après confirmation |
| Deux appareils hors ligne démarrent | Conflit au sync, choix utilisateur obligatoire |
| Séries distinctes ajoutées | Conserver si IDs distincts |
| Même série modifiée | Dernière opération avec trace |
| A termine, B continue | Séance terminée verrouillée ; B doit créer une correction explicite |

Aucune fusion automatique de minuteur.

### 4.14 Suggestions de progression

Séparer :

- proposition calculée ;
- décision utilisateur ;
- date d’acceptation ;
- application effective.

Les propositions sont recalculables. Les décisions sont synchronisées.

### 4.15 Badges

Modèle cible : une ligne par badge.

Clé :

```text
achievement:<achievementId>
```

Conflit :

- badge débloqué sur deux appareils : conserver une ligne ;
- `earnedAt` : conserver la date valide la plus ancienne ;
- un badge débloqué n’est jamais retiré automatiquement.

### 4.16 Thèmes de récompense

- thèmes débloqués : union ;
- thème actif : dernière opération ;
- clair/sombre/système : local à l’appareil ;
- un thème actif non débloqué après fusion est remplacé par le thème classique.

### 4.17 Missions hebdomadaires

Clé :

```text
weekly-mission:<weekStart>
```

- complétion sur deux appareils : fusion ;
- `completedAt` : date valide la plus ancienne ;
- une complétion enregistrée n’est pas retirée automatiquement.

### 4.18 Objectifs personnels

Chaque objectif devient une ligne, pas un tableau unique.

| Élément | Règle |
|---|---|
| Nouveaux objectifs | Conserver tous les IDs distincts |
| Même objectif, champs distincts | Fusion partielle |
| Même cible modifiée | Dernière opération avec trace |
| Jalons atteints | Union ou recalcul depuis les données |
| Objectif terminé / réouvert | Dernière action explicite |
| Suppression / progression | Suppression gagnante |

`reachedMilestones` devrait idéalement être recalculé plutôt que fusionné comme tableau.

### 4.19 Planning d’endurance

Chaque séance planifiée devient une ligne.

- deux séances distinctes le même jour : conserver ;
- même séance déplacée sur deux appareils : dernière opération ;
- `skipped` puis activité correspondante enregistrée : l’activité ne réactive pas automatiquement la séance ;
- séance supprimée / activité réelle : l’activité reste conservée ;
- statut « terminé » reste dérivé du rapprochement avec les activités si ce modèle est maintenu.

### 4.20 Rappels

#### Préférences

Synchronisées via les réglages utilisateur.

#### Complétion

Clé :

```text
routine-reminder:<date>:<type>
```

- terminé sur un appareil : terminé pour le compte ;
- deux complétions : conserver la première date valide.

#### Affichage et report

Locaux :

- `lastShownAt` ;
- `snoozedUntil`.

Conséquence acceptée : un report sur téléphone ne reporte pas nécessairement le rappel sur ordinateur.

### 4.21 Corbeille

La corbeille actuelle ne doit pas être synchronisée brute.

Règle cible :

- suppression = `deletedAt` ;
- restauration = suppression de `deletedAt` avec nouvelle révision ;
- purge = action explicite ou expiration ;
- suppression parent/enfants cohérente ;
- purge sur un appareil se propage.

Une restauration après purge physique est impossible et doit être clairement indiquée.

## 5. Opérations Dexie à privilégier

### Mise à jour partielle

```ts
await table.update(id, {
  notes,
  updatedAt,
});
```

### Modification en masse intentionnelle

```ts
await table
  .where({ parentId })
  .modify({ deletedAt });
```

La requête exprime l’intention sur une collection.

### À éviter

```ts
await table.put(fullObject);
```

lorsque seule une propriété a changé.

## 6. Registre de conflits

Le prototype doit enregistrer localement les conflits métier critiques sans données complètes :

```text
id
entityType
entityId
detectedAt
localOperation
resolution
deviceId
```

Ne pas journaliser :

- poids ;
- aliments ;
- notes ;
- contenu des séances.

Pour la production, décider si ce registre reste local ou devient un audit serveur.

## 7. Tests obligatoires par règle

Pour chaque domaine généralisé :

1. appareil A et B synchronisés ;
2. les deux passent hors ligne ;
3. conflit créé volontairement ;
4. A se reconnecte ;
5. B se reconnecte ;
6. résultat vérifié sur A, B et après rechargement ;
7. export JSON effectué ;
8. restauration locale testée.

## 8. Critères de refus

Une table ne passe pas en synchronisation si :

- l’ID n’est pas universel ou déterministe ;
- la suppression n’est pas définie ;
- un `put()` global peut écraser des enfants ;
- une contrainte unique peut échouer à la reconnexion ;
- la relation parent/enfant n’a pas de règle ;
- le backup ne sait pas exporter la nouvelle forme ;
- aucun test de conflit n’existe.
