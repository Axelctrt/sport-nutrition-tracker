# SportPilot 0.29.0 — A20 R3 — Partage social piloté uniquement par ami

## Décision produit

Le partage des activités n'est plus configuré à plusieurs endroits. La permission associée à chaque ami devient l'unique réglage visible et l'unique source de décision pour les snapshots sociaux.

Chaque ami possède l'un des trois niveaux suivants :

- `none` : aucune activité visible ;
- `summary` : carte résumée uniquement ;
- `detailed` : résumé et champs personnalisés autorisés pour cet ami.

Le réglage global historique et les sélecteurs présents dans les formulaires d'activité ou de séance de musculation ne sont plus affichés et ne limitent plus silencieusement les permissions par ami.

## Interface mobile-first

La carte ami reste compacte :

- une ligne `Partage : …` ;
- un bouton d'ouverture `Gérer` ;
- trois choix courts : Aucun, Résumé, Personnalisé ;
- deux groupes repliables seulement : Musculation et Cardio.

Les longues listes restent fermées par défaut. Les calories et le RPE indiquent clairement qu'ils ne sont visibles que lorsque la donnée existe. L'option graphique est retirée tant qu'aucune série temporelle fiable n'est stockée par SportPilot.

## Règles de publication

Pour chaque activité publiable :

1. SportPilot parcourt les amis actifs ;
2. la permission de l'ami détermine `none`, `summary` ou `detailed` ;
3. en mode personnalisé, la sélection de champs de cet ami est appliquée ;
4. le serveur revérifie l'amitié, le niveau et les champs avant toute écriture ou lecture.

Un ancien réglage d'activité `private` reste respecté par compatibilité afin de ne pas republier accidentellement une activité historiquement privée. Les anciens modes `summary`, `detailed`, `custom` et `inherit` ne remplacent plus la permission de l'ami.

## Compatibilité et stockage

- aucune migration Dexie supplémentaire ;
- aucune migration D1 supplémentaire ;
- la colonne A20 `field_selection_json` existante reste utilisée ;
- les anciennes préférences globales peuvent encore être relues dans les sauvegardes, mais elles n'interviennent plus dans la décision de partage ;
- les anciennes sélections contenant des champs non proposés, notamment `chart` et `paceSeries`, sont nettoyées lors du prochain enregistrement depuis l'éditeur compact.

## Sécurité

Le niveau `none` est contrôlé à trois endroits :

- domaine et cache local ;
- endpoint de permissions D1 ;
- publication, fil et route de détail des snapshots.

Une carte locale obsolète est également filtrée par la permission courante. Le masquage ne repose donc jamais uniquement sur l'interface.
