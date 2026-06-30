# C4 — synchronisation limitée des vraies pesées SportPilot

## Statut

C4 introduit une synchronisation **manuelle, explicite et réversible** des seules pesées réelles de SportPilot.

Le lot ne synchronise pas :

- le profil ;
- la nutrition ;
- les séances ;
- les activités ;
- les pas ;
- les paramètres ;
- les récompenses ;
- les sauvegardes.

La base locale réelle reste `sportpilot-local-database`. Le cloud reste la base expérimentale `sportpilot-sync-prototype`.

## Activation

Deux flags sont nécessaires :

```env
VITE_ENABLE_SYNC_PROTOTYPE=true
VITE_ENABLE_REAL_WEIGHT_SYNC=true
```

`VITE_ENABLE_REAL_WEIGHT_SYNC` vaut `false` par défaut. Lorsque ce flag est désactivé :

- aucune lecture des tables locales réelles n'est déclenchée par l'écran C4 ;
- aucune écriture cloud C4 n'est proposée ;
- l'ensemble de l'application continue à fonctionner localement.

Après toute modification de `.env.local`, Vite doit être redémarré.

## Tables

### Base locale réelle

C4 utilise uniquement les tables existantes :

- `weights` ;
- `deletionRecords`, filtrée sur `entityType = "weight"`.

Aucune version supplémentaire de `AppDatabase` n'est ajoutée. Le schéma réel reste Dexie v8 et le format de sauvegarde reste JSON v7.

### Base expérimentale Dexie Cloud

La base du prototype passe à la version 2 et ajoute :

- `realWeights` ;
- `realWeightDeletionRecords`.

Les tables fictives `weights` et `deletionRecords` restent séparées.

Les identifiants cloud C4 sont des **identifiants privés Dexie Cloud** préfixés par `#`. Par exemple :

```text
local : weight:2026-07-01
cloud : #weight:2026-07-01
```

Dexie Cloud transforme ce type d'identifiant dans un namespace privé propre au compte. Deux utilisateurs peuvent donc posséder une pesée à la même date sans collision de clé primaire.

## Modèle de convergence

C4 compare les états local et cloud par identifiant déterministe.

Pour chaque date :

1. la pesée ayant le `updatedAt` le plus récent est retenue ;
2. à égalité d'horodatage, une comparaison déterministe du contenu tranche ;
3. un marqueur `deleted` plus récent ou égal à la pesée supprime celle-ci des deux côtés ;
4. une pesée plus récente qu'un marqueur `deleted` produit un marqueur `restored` ;
5. une seconde exécution sans changement ne produit aucune nouvelle écriture.

Cette stratégie rend l'opération idempotente et récupérable après une interruption. Les écritures concernent deux bases IndexedDB distinctes et ne peuvent donc pas former une transaction atomique unique. Une nouvelle exécution termine la convergence après une interruption partielle.

## Recréation après suppression

Le dépôt local `DexieWeightRepository` écrit désormais un marqueur `restored` lorsqu'une date supprimée est recréée. Cette écriture est réalisée dans la même transaction locale que la nouvelle pesée.

Cela distingue :

- une ancienne copie hors ligne qui tente de ressusciter une suppression ;
- une recréation volontaire plus récente par l'utilisateur.

## Interface

La section `C4 — vraies pesées SportPilot` est repliable et fermée par défaut.

Lorsque le flag est actif et le compte connecté :

- `Analyser sans modifier` calcule les écarts sans écrire ;
- `Synchroniser les vraies pesées` ouvre une confirmation ;
- l'action confirmée réalise la convergence locale/cloud ;
- un récapitulatif indique les envois, téléchargements et suppressions.

Aucune synchronisation réelle n'est déclenchée automatiquement lors de l'ouverture de l'application ou lors de l'ajout d'une pesée.

## Import initial

Le premier lancement suit ce protocole :

1. connecter le compte Dexie Cloud choisi ;
2. ouvrir C4 ;
3. lancer `Analyser sans modifier` ;
4. vérifier les compteurs ;
5. confirmer explicitement la synchronisation ;
6. relancer l'analyse ;
7. attendre `Éléments différents : 0`.

Si le cloud est vide, les pesées locales sont importées une fois. Les relances suivantes ne créent pas de doublons.

## Restauration sur un nouvel appareil

Sur un appareil sans pesée locale :

1. activer les deux flags ;
2. connecter le même compte ;
3. analyser ;
4. confirmer la synchronisation ;
5. vérifier que les pesées cloud sont restaurées dans `sportpilot-local-database` ;
6. vérifier qu'elles apparaissent dans l'écran réel de suivi du poids.

## Rollback immédiat

Le rollback fonctionnel ne supprime aucune donnée :

```env
VITE_ENABLE_REAL_WEIGHT_SYNC=false
```

Après redémarrage de Vite, l'interface C4 reste visible mais désactivée et aucune nouvelle convergence réelle ne peut être lancée.

Les pesées déjà restaurées localement restent dans la base réelle. Les copies cloud restent privées et intactes pour permettre une reprise ultérieure.

Le rollback Git consiste à revenir au commit C3 si C4 n'a pas encore été fusionné. Il ne faut pas supprimer les tables cloud ni la base locale pendant l'évaluation.

## Matrice de validation manuelle

Toutes les manipulations doivent être précédées d'une sauvegarde JSON locale.

### C4-01 — flag désactivé

- laisser `VITE_ENABLE_REAL_WEIGHT_SYNC=false` ;
- vérifier que la section indique `Désactivé` ;
- vérifier qu'aucun bouton de synchronisation réelle n'est proposé.

### C4-02 — analyse sans écriture

- activer le flag ;
- lancer l'analyse ;
- vérifier que les données locales et cloud ne changent pas ;
- noter les compteurs affichés.

### C4-03 — import initial PC vers cloud

- utiliser un compte de test dédié ;
- analyser puis synchroniser ;
- relancer l'analyse ;
- vérifier `Éléments différents : 0` ;
- relancer la synchronisation et vérifier qu'aucun doublon n'apparaît.

### C4-04 — restauration cloud vers iPhone

- utiliser le même compte sur l'iPhone ;
- partir d'un stockage local sans pesées ou d'une installation de test ;
- analyser puis synchroniser ;
- vérifier les pesées dans l'écran réel de SportPilot.

### C4-05 — ajout sur PC

- ajouter une vraie pesée sur PC ;
- synchroniser C4 ;
- synchroniser sur iPhone ;
- vérifier la date, le poids et la note.

### C4-06 — modification sur iPhone

- modifier la même pesée sur iPhone ;
- synchroniser ;
- synchroniser sur PC ;
- vérifier la convergence.

### C4-07 — suppression

- supprimer une pesée sur un appareil ;
- synchroniser les deux appareils ;
- vérifier qu'elle disparaît et ne réapparaît pas après actualisation.

### C4-08 — recréation volontaire

- recréer la même date après suppression ;
- synchroniser ;
- vérifier la nouvelle pesée sur les deux appareils ;
- vérifier qu'elle ne disparaît pas au prochain cycle.

### C4-09 — appareil hors ligne

- modifier une pesée hors ligne ;
- rétablir le réseau ;
- synchroniser ;
- vérifier la convergence sur l'autre appareil.

### C4-10 — interruption et reprise

- interrompre le réseau pendant une synchronisation ;
- rétablir le réseau ;
- relancer l'action ;
- vérifier `Éléments différents : 0`.

### C4-11 — deuxième compte

- connecter un autre compte ;
- vérifier qu'il ne reçoit aucune pesée du premier compte ;
- créer la même date sur les deux comptes ;
- vérifier l'absence de collision et de fuite.

### C4-12 — sauvegarde JSON

- exporter une sauvegarde avant et après C4 ;
- vérifier que le format reste JSON v7 ;
- restaurer la sauvegarde dans un environnement de test ;
- vérifier les pesées et leurs marqueurs de suppression.

### C4-13 — rollback par flag

- remettre le flag à `false` ;
- redémarrer Vite ;
- vérifier que toutes les fonctions locales de poids continuent à fonctionner ;
- vérifier qu'aucune synchronisation réelle ne peut être lancée.

## Critères de décision

### GO

- aucun doublon après plusieurs passages ;
- aucune fuite entre comptes ;
- suppression et recréation convergentes ;
- restauration réussie sur un nouvel appareil ;
- sauvegarde JSON inchangée et restaurable ;
- fonctionnement local intact lorsque le flag est désactivé ;
- tous les tests automatisés et manuels réussis.

### NO-GO

- perte ou modification inattendue d'une pesée ;
- collision entre comptes ;
- réapparition d'une pesée supprimée ;
- import non idempotent ;
- corruption de la sauvegarde ;
- dépendance de l'application locale au service cloud ;
- échec non récupérable après interruption réseau.
