# Matrice de conflits de synchronisation

- **Projet :** SportPilot
- **Fournisseur candidat :** Dexie Cloud
- **Base locale préparée :** Dexie v8 / backup JSON v7
- **Date de mise à jour :** 29 juin 2026
- **Portée :** prototype des pesées, puis généralisation progressive

## 1. Principes

1. Une création ne doit jamais écraser une création portant un autre ID.
2. Une mise à jour partielle utilise `update()` lorsque l’intention porte sur certains champs.
3. Un remplacement complet par `put()` reste une intention explicite.
4. Les données critiques ne sont pas résolues uniquement par l’horodatage métier.
5. Une suppression durable est portée par un `deletionRecord` au statut `deleted`.
6. Une restauration crée une révision plus récente au statut `restored`.
7. Les snapshots complets de `trashItems` restent locaux.
8. Les tableaux fréquemment modifiés sont normalisés en lignes enfants.
9. Les contraintes métier utilisent des IDs déterministes ou une fusion dédiée.
10. Toute résolution automatique est testée hors ligne sur deux appareils.

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
| Créations avec IDs différents | Deux activités hors ligne | Conserver les deux | Automatique |
| Champs différents du même objet | Titre sur A, notes sur B | Fusion propriété par propriété | Automatique |
| Même champ modifié | Même note sur A et B | Dernière opération causale | Automatique avec trace si critique |
| Remplacements complets concurrents | Deux `put()` | Dernière opération remplace l’objet | À éviter par conception |
| Suppression puis modification | A supprime, B modifie | `deleted` gagne | Automatique avec trace |
| Suppression puis restauration | B restaure explicitement | Révision `restored` plus récente | Automatique si le snapshot existe |
| Restauration et contenu divergent | A modifie, B restaure un ancien snapshot | Aperçu et choix | Interaction utilisateur |
| Suppression parent / ajout enfant | Recette supprimée, ingrédient ajouté | Parent supprimé ; enfant rejeté ou supprimé | Automatique |
| Deux créations sur une unicité | Deux pesées le même jour | Convergence sur l’ID déterministe | Automatique avec règle domaine |
| Import JSON pendant la sync | Import massif | Interdit dans le prototype | Blocage |
| Changement de compte | Base liée à un autre compte | Backup puis base séparée ou effacée | Blocage jusqu’à confirmation |
| Horloge locale incorrecte | Appareil décalé | Ne pas utiliser seulement `updatedAt` | Moteur de sync |

## 4. Suppressions

### 4.1 Modèle préparé

```text
delete:
  deletion:<entityType>:<entityId>
  status = deleted
  deletedAt = date de la suppression
  updatedAt = révision de la suppression

restore:
  même identifiant
  status = restored
  restoredAt = date de restauration
  updatedAt = révision plus récente
```

`deletionRecords` est synchronisable et exporté par le backup JSON v7.

`trashItems` reste local et contient le snapshot nécessaire à une restauration pendant sa durée de rétention.

### 4.2 Règles

| Scénario | Règle |
|---|---|
| Ancien appareil renvoie un objet marqué `deleted` | Rejeter ou supprimer l’objet actif |
| Marqueur `restored` plus récent | Autoriser la réintroduction restaurée |
| Snapshot expiré mais marqueur `deleted` présent | Suppression toujours effective ; restauration locale impossible |
| Purge de la corbeille | Supprimer seulement `trashItems`, conserver le marqueur |
| Parent supprimé | Marquer aussi les enfants couverts |
| Backup ancien sans marqueur | Initialiser `deletionRecords` à vide |

### 4.3 Cascades couvertes

- repas → entrées alimentaires ;
- recette → ingrédients ;
- exercice de séance → séries.

## 5. Règles par domaine

### 5.1 Profil

| Conflit | Règle |
|---|---|
| Champs distincts | Fusion partielle |
| Même champ | Dernière opération causale |
| Profil local et cloud différents au premier login | Aperçu et choix explicite |
| Suppression | Équivalent à suppression de compte, jamais automatique |

### 5.2 Paramètres

#### `userSettings`

- fusion champ par champ ;
- validation des valeurs après fusion ;
- même champ : dernière opération causale.

#### `deviceSettings`

- aucun conflit distant ;
- jamais exporté ni synchronisé ;
- `deviceId`, thème clair/sombre, minuteur et métadonnées de backup restent locaux.

### 5.3 Pesées — domaine du prototype

Clé logique et ID :

```text
weight:<YYYY-MM-DD>
```

| Scénario | Règle du prototype |
|---|---|
| A et B créent une pesée différente le même jour | Une seule entité converge ; dernière saisie causale par défaut |
| A modifie la note, B le poids | Fusion partielle |
| A supprime, B modifie hors ligne | `deletionRecord.deleted` gagne |
| A restaure après la suppression | `restored` gagne si sa révision est plus récente |
| Import JSON | Interdit tant que la sync est active |

Le prototype doit observer et documenter le comportement réel du moteur lors d’une collision d’index unique.

### 5.4 Pas journaliers

Clé : `steps:<YYYY-MM-DD>`.

- saisie manuelle : dernière opération ;
- ne pas prendre automatiquement le maximum ;
- une future source automatique doit être séparée par provenance.

### 5.5 Activités

- IDs distincts : conserver ;
- champs distincts : fusion partielle ;
- même distance ou durée : dernière opération avec trace ;
- suppression contre modification : suppression gagnante ;
- doublon probable : signaler, ne pas dédupliquer silencieusement.

### 5.6 Nutrition

#### Repas

Clé : `meal:<date>:<slot>`.

Deux créations pour le même créneau convergent vers le même parent. Les entrées portant des IDs distincts sont conservées.

#### Entrées

- IDs distincts : conserver ;
- même ID : mise à jour partielle ;
- suppression du repas : suppression des entrées dans la même intention ;
- conserver un snapshot nutritionnel suffisant si la référence produit disparaît.

#### Produits

Avant généralisation :

- cache Open Food Facts local ;
- produit personnalisé synchronisé ;
- favori synchronisé ;
- correction personnelle prioritaire sur la donnée externe.

### 5.7 Recettes et favoris

| Conflit | Règle |
|---|---|
| Deux ingrédients ajoutés | Conserver les deux |
| Même ingrédient modifié | Fusion partielle |
| Même `sortOrder` | Trier par `sortOrder`, puis ID |
| Recette supprimée / ingrédient ajouté | Suppression du parent gagnante |
| Recette renommée / ingrédient ajouté | Fusion |

### 5.8 Objectifs journaliers et journal

- ID déterministe par date ;
- champs distincts : fusion ;
- même champ : dernière opération ;
- journal validé puis modifié : conserver l’action, signaler que le contenu a changé.

### 5.9 Bilans hebdomadaires

Clé : `weekly-review:<weekStart>`.

- génération automatique concurrente : conserver une version canonique ;
- décision utilisateur acceptée : ne pas l’écraser par un recalcul silencieux ;
- nouvelle génération : révision explicite ou confirmation.

### 5.10 Ajustements caloriques

- conserver l’historique ;
- chevauchement de périodes : interaction utilisateur ;
- ne pas recalculer silencieusement une décision acceptée.

### 5.11 Catalogue d’exercices

- catalogue fourni : local/versionné ou realm public en lecture seule ;
- exercice personnalisé : privé et synchronisé ;
- modification personnelle d’un exercice fourni : créer une personnalisation.

### 5.12 Modèles de musculation

- parents et enfants séparés ;
- nouveaux enfants avec IDs différents : conserver ;
- même position : `sortOrder`, puis ID ;
- suppression du modèle : marquer/supprimer les enfants ;
- séance déjà créée : ne pas la réécrire depuis le modèle.

### 5.13 Séance en cours

État cible :

```text
status
activeDeviceId
leaseUpdatedAt
```

| Scénario | Règle |
|---|---|
| A démarre, B ouvre | B en lecture seule |
| Bail expiré | B peut reprendre après confirmation |
| Deux démarrages hors ligne | Choix utilisateur obligatoire |
| Séries distinctes | Conserver si IDs distincts |
| Même série modifiée | Dernière opération avec trace |
| A termine, B continue | Séance terminée verrouillée ; correction explicite |

Aucune fusion automatique de minuteur.

### 5.14 Suggestions de progression

- proposition calculée : recalculable ;
- décision utilisateur : synchronisée ;
- date d’acceptation et application effective : synchronisées.

### 5.15 Badges, thèmes et missions

- badge ou thème débloqué : union monotone ;
- `earnedAt` ou `unlockedAt` : plus ancienne date valide ;
- thème de récompense actif : dernière opération ;
- thème clair/sombre/système : local ;
- mission terminée : une ligne par semaine, jamais retirée automatiquement.

### 5.16 Objectifs personnels

- nouveaux IDs : conserver ;
- même objectif, champs distincts : fusion partielle ;
- même cible : dernière opération avec trace ;
- jalons : union ou recalcul ;
- suppression contre progression : suppression gagnante.

### 5.17 Planning d’endurance

- séances distinctes le même jour : conserver ;
- même séance déplacée : dernière opération ;
- séance ignorée puis activité réelle : pas de réactivation automatique ;
- séance supprimée : l’activité réelle reste conservée.

### 5.18 Rappels

- préférences : `userSettings`, synchronisées ;
- complétions : une ligne déterministe par date et type ;
- `lastShownAt` et `snoozedUntil` : locaux.

## 6. Registre de conflits

Les conflits métier critiques peuvent être journalisés localement sans contenu complet :

```text
id
entityType
entityId
detectedAt
localOperation
resolution
deviceId
```

Ne pas journaliser le poids, les aliments, les notes ou le contenu des séances.

## 7. Tests obligatoires

Pour chaque domaine généralisé :

1. synchroniser A et B ;
2. passer les deux hors ligne ;
3. créer le conflit ;
4. reconnecter A ;
5. reconnecter B ;
6. vérifier A, B et après rechargement ;
7. exporter un backup JSON ;
8. vérifier une restauration locale ;
9. répéter avec suppression et restauration lorsque le domaine est couvert.

## 8. Critères de refus

Une table ne passe pas en synchronisation si :

- l’ID n’est pas universel ou déterministe ;
- la suppression n’est pas définie ;
- un remplacement complet peut écraser une modification concurrente ;
- une contrainte unique peut bloquer la reconnexion ;
- une relation parent/enfant n’a pas de règle ;
- le backup ne sait pas exporter et restaurer sa forme ;
- aucun test de conflit n’existe ;
- la table mélange encore données utilisateur et cache externe sans distinction.
