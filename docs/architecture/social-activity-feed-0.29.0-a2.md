# SportPilot 0.29.0 A2 — Contrat versionné des snapshots sociaux

## Statut

- Sous-phase A2 de la phase 2 implémentée.
- Aucun branchement sur les écritures d'activités ou de séances.
- Aucune migration Dexie, sauvegarde ou D1.
- Le snapshot historique 0.27/0.28 reste intact pour éviter une régression prématurée.

## Décision d'architecture

Le modèle 0.29 est introduit dans `socialActivitySnapshotContract.ts` en parallèle du modèle historique.
La bascule vers ce contrat sera réalisée seulement lors de la sous-phase de génération locale et d'outbox.

## Identité déterministe

La clé est stable pour :

```text
(ownerUserId, recipientUserId, sourceKind, sourceActivityId)
```

Elle ne dépend pas :

- du niveau résumé/détaillé/personnalisé ;
- de la révision source ;
- de la date de publication.

Une modification effectue donc un upsert sur la même projection. Un changement de visibilité ne peut plus laisser deux snapshots actifs.

## Enveloppe commune

Chaque projection active contient :

- `contractVersion` ;
- `snapshotId` ;
- propriétaire et destinataire ;
- type et identifiant de source ;
- révision source ;
- dates de création et mise à jour ;
- visibilité effective ;
- famille et type d'activité ;
- date de réalisation ;
- champs autorisés ;
- résumé filtré ;
- détail typé éventuel.

L'heure exacte et le titre restent optionnels et ne peuvent être présents que si les champs correspondants sont autorisés.

## Variantes typées

### Cardio

Le contrat peut représenter uniquement des données explicitement structurées :

- métadonnées de séance déjà persistées ;
- rythme et série de rythme ;
- intervalles ;
- tours ;
- segments ;
- graphique typé.

Aucune donnée absente du modèle métier ne sera simulée par les futurs projecteurs.

### Musculation

Le contrat représente une séance terminée à partir des modèles métier existants :

- nom de séance ;
- groupes musculaires ;
- exercices ;
- séries ;
- répétitions ;
- charges ;
- poids du corps ;
- durée/distance de série ;
- RPE ;
- repos.

Les charges peuvent être absentes tandis que les exercices, séries et répétitions restent présents.
Les notes de séance, d'exercice et de série restent interdites.

### Générique

Une variante minimale sans blob arbitraire est réservée aux activités compatibles qui ne nécessitent pas encore un détail spécialisé.

## Suppression et révocation

Un tombstone minimal utilise la même clé que la projection active et contient :

- la révision de suppression ;
- la date de suppression ;
- le motif `sourceDeleted`, `sharingDisabled` ou `friendRevoked`.

Le tombstone ne transporte aucun résumé ni détail sportif.

## Validation runtime

Le validateur contrôle notamment :

- la version du contrat ;
- la clé déterministe ;
- la cohérence source/famille/type ;
- les clés autorisées à chaque niveau ;
- la correspondance entre payload et champs partagés ;
- l'absence de détail en mode résumé ;
- la présence d'un détail en mode détaillé ;
- l'absence récursive des champs source interdits ;
- la séparation stricte cardio/musculation.

## Ajustement A1

Les champs de politique suivants sont ajoutés pour couvrir les données déjà présentes dans les modèles métier :

- commun : `intensity` ;
- cardio : `sessionType`, `terrain`, `stroke`, `poolLength`, `bikeType`, `environment`.

Les réglages prudents par défaut ne changent pas.

## Suite recommandée

A3 doit persister la politique globale 0.29 dans le stockage local et la continuité de compte, sans encore publier de snapshot réel.
