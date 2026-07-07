# SportPilot 0.29.0 A5 — Branchement runtime des snapshots sociaux

## Statut

A5 branche la projection sociale 0.29 sur les opérations métier réellement utilisées par SportPilot, sans activer de publication réseau et sans modifier les écrans.

## Flux actifs

### Activités cardio et endurance

`createActivityFromDraft`, `updateActivityFromDraft` et `deleteActivityAndRecalculate` déclenchent désormais, après la réussite du traitement sportif :

1. le chargement de l’identité sociale locale ;
2. le chargement des amis et permissions locales ;
3. la résolution du niveau résumé ou détaillé par destinataire ;
4. la projection filtrée A3 ;
5. l’upsert ou le tombstone dans la file IndexedDB A4.

Une activité `strengthTraining` générique reste volontairement ignorée : le détail musculation provient de l’agrégat de séance complet.

### Séances de musculation

`completeWorkoutSession` déclenche la projection uniquement après le passage réussi de la séance à l’état `completed`.

Le runtime recharge alors :

- les exercices de séance ;
- les séries de la séance ;
- les définitions d’exercices nécessaires aux groupes musculaires.

Une séance en cours ou abandonnée n’est pas publiée.

## Isolation des erreurs

L’observateur social est exécuté en mode best effort :

- la donnée sportive est persistée en premier ;
- le recalcul métier reste prioritaire ;
- une erreur Dexie sociale, une identité indisponible ou une erreur de projection n’annule jamais la création, la modification, la suppression ou la fin de séance.

Les tests vérifient explicitement cette règle.

## Destinataires et révocation

La réconciliation utilise l’union de :

- la liste actuelle des amis disposant d’un `userId` réel ;
- les destinataires déjà présents dans la file pour la même source.

Conséquences :

- un ami local sans `userId` cloud est ignoré sans erreur ;
- un ancien destinataire absent de la liste actuelle reçoit un tombstone `friendRevoked` lors de la prochaine réconciliation de la source ;
- une activité supprimée produit un tombstone `sourceDeleted` pour tous ses destinataires déjà connus ;
- un partage désactivé produit un tombstone `sharingDisabled` lors de la réconciliation de l’activité.

## Compatibilité avec les réglages existants

A5 traduit provisoirement les réglages historiques :

- `disabled` ou profil privé → `private` ;
- `summary-only` → `summary` ;
- `detailed` → `detailed`, puis limitation par permission ami.

Le contrat accepte déjà une surcharge par activité, mais sa persistance et son interface seront réalisées dans les phases dédiées aux réglages globaux et par activité.

## Limites volontaires

A5 ne réalise pas encore :

- la republication en masse immédiatement après un changement global de confidentialité ;
- la surcharge de confidentialité depuis les formulaires d’activité ;
- la suppression d’une séance de musculation terminée, aucun flux métier de suppression de séance n’existant actuellement ;
- la livraison D1 ;
- la lecture du fil réel ;
- les écrans de détail social.

## Stockage et migrations

Aucune migration :

- base principale : version 10 inchangée ;
- prototype de synchronisation : version 14 inchangée ;
- file sociale dédiée : version 1 inchangée ;
- contrat d’outbox : `0.29.0-a4` inchangé.
