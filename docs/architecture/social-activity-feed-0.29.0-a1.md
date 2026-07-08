# SportPilot 0.29.0 A1 — Audit et contrat de partage social

## Statut

- Phase 0 auditée sur le commit `2b2a5ce`.
- Première sous-phase de la phase 1 implémentée.
- Aucune migration Dexie, sauvegarde ou D1.
- Aucun branchement sur les écrans ou les écritures d’activité dans cette sous-phase.

## Cartographie du socle existant

### Déjà opérationnel

- identité sociale et handle exact ;
- demandes d’amis entrantes et sortantes ;
- amitiés ;
- permissions résumé/détail par ami ;
- stockage local Dexie des réglages amis ;
- persistance serveur D1 de l’annuaire, des demandes, des amitiés et des permissions ;
- génération locale de snapshots filtrés à partir du modèle `Activity` ;
- conversion de snapshots en items de feed ;
- table `socialActivitySnapshots` dans le prototype Dexie Cloud ;
- tests et audits anti-fuite historiques.

### Présent mais non connecté au flux réel

- `prepareSocialActivitySnapshots` n’est appelé par aucun flux de création ou modification d’activité ;
- `publishSocialCloudActivitySnapshots` n’est appelé par aucun écran ou orchestrateur ;
- `loadSocialCloudActivityFeed` n’est pas utilisé par la page Amis ;
- `FriendsPrivacyPage` reçoit uniquement `initialActivitySnapshots`, valeur vide en runtime normal ;
- aucune Pages Function D1 ne publie, ne met à jour, ne supprime ou ne pagine les snapshots sociaux.

### Limites du modèle 0.27/0.28

- niveaux limités à `summary` et `detailed` ;
- absence de niveau `private` par activité, `custom` et `inherit` ;
- calories toujours incluses dans les snapshots historiques ;
- détails cardio limités à quelques champs statiques ;
- cadence, intervalles et graphique volontairement absents ;
- aucune structure de détail de musculation ;
- une activité `strengthTraining` ne référence pas les tables `WorkoutSession`, `WorkoutSessionExercise` et `StrengthSet` ;
- identifiant du snapshot historique dépendant du scope, donc risque de conserver deux versions actives après changement de permission ;
- absence de révision source, version métier 0.29, état de suppression et pagination ;
- aucune suppression distante lors d’un passage en privé ou d’une suppression métier.

## Flux réel observé

```text
Activité / séance privée
        |
        +--> dépôt local Dexie
        +--> synchronisation métier existante

Socle social historique séparé
        |
        +--> génération manuelle de snapshots filtrés
        +--> prototype Dexie Cloud socialActivitySnapshots
        +--> feed local alimenté uniquement par injection de tests
```

Le flux cible 0.29.0 n’est donc pas encore branché :

```text
Écriture métier
  -> résolution de la politique globale + surcharge activité
  -> projection typée filtrée
  -> upsert local déterministe
  -> publication serveur authentifiée
  -> feed paginé
  -> détail autorisé chargé à la demande
```

## Risques prioritaires

1. **Authentification serveur** : les Pages Functions sociales existantes reçoivent actuellement des `userId` du navigateur. Le futur endpoint de snapshots ne doit pas considérer ce paramètre comme une preuve d’identité.
2. **Révocation** : masquer un champ dans React ne suffit pas. Le snapshot persisté et la réponse serveur doivent être régénérés ou supprimés.
3. **Doublons** : la clé future doit être stable pour `(ownerUserId, sourceKind, sourceActivityId, recipientUserId)` et indépendante du niveau de partage.
4. **Musculation** : la projection doit agréger les tables métier existantes, sans dupliquer un second modèle de séance.
5. **Cardio** : plusieurs métriques souhaitées ne sont pas persistées aujourd’hui. Elles ne devront pas être simulées.
6. **Hors ligne** : une panne sociale ne doit jamais empêcher l’enregistrement local de l’activité sportive.
7. **Cache** : une activité devenue privée doit être supprimée du cache du destinataire après réconciliation.

## Contrat A1

Le fichier `socialActivitySharingPolicy.ts` introduit :

- les niveaux `private`, `summary`, `detailed`, `custom` ;
- le mode par activité `inherit` ;
- les champs communs, cardio et musculation ;
- une liste de champs source interdits ;
- un réglage global prudent en résumé ;
- une résolution déterministe global/activité ;
- un plafonnement par permission ami qui ne peut jamais ajouter de données ;
- des dépendances de structure : répétitions/charges/RPE impliquent séries et exercices ;
- des validateurs runtime ;
- une décision de cycle de vie `none/upsert/delete`.

## Décisions de confidentialité

- `private` : aucune publication ;
- `summary` : type, titre, date, durée et résumé adapté à la famille ;
- `detailed` : champs détaillés autorisés par la politique ;
- `custom` : sélection explicite ;
- `inherit` : la surcharge reprend la politique globale ;
- notes libres et objets de calcul restent interdits ;
- calories, fréquence cardiaque, RPE et charges ne sont pas activés par le réglage prudent par défaut ;
- masquer les charges n’empêche pas d’afficher exercices, séries et répétitions ;
- une permission ami `summary` intersecte la politique propriétaire au lieu de remplacer celle-ci par un résumé plus large.

## Découpage recommandé après A1

1. **A2 — Snapshot social 0.29 typé et déterministe** : enveloppe versionnée, variantes cardio/musculation/générique, validateurs, révision et suppression.
2. **A3 — Persistance des réglages globaux** : Dexie, sauvegarde et synchronisation compte.
3. **A4 — Surcharge par activité/séance** : modèle et formulaires mobile-first.
4. **A5 — Génération locale et outbox** : branchement aux écritures métier sans bloquer le sport.
5. **A6 — API serveur authentifiée et migration D1**.
6. **A7 — Feed réel paginé et cache**.
7. **A8 — Cartes et détails mobile-first**.
8. **A9 — Révocation, suppression, hors ligne et recette deux comptes**.
