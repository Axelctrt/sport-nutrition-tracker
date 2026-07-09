# SportPilot 0.30.0 — U2B.1 Poids de référence hebdomadaire

## Décision métier appliquée

Pour toute date de calcul, SportPilot utilise désormais :

1. la moyenne des pesées de la semaine civile précédente, du lundi au dimanche ;
2. une seule valeur représentative par jour ;
3. la dernière valeur enregistrée lorsqu’un jeu de données contient exceptionnellement plusieurs pesées le même jour ;
4. le poids du profil lorsqu’aucune pesée valide n’existe pendant la semaine précédente.

Une seule journée pesée suffit pour produire une moyenne valide. Le moteur conserve la précision complète de la moyenne ; l’interface peut l’afficher avec le formatage local.

## Temporalité

Une pesée appartient au poids de référence de la semaine suivante. Une modification locale de pesée :

- ne réécrit jamais automatiquement une semaine entièrement terminée ;
- recalcule la journée courante lorsqu’elle appartient à la semaine affectée ;
- recalcule les objectifs futurs déjà persistés dans cette semaine ;
- ne crée pas artificiellement les sept objectifs d’une semaine future.

Les recalculs issus des synchronisations de poids seront traités dans le bloc U2B.5 consacré à l’historique et au multi-appareil.

## Persistance et compatibilité

Aucune migration Dexie ou D1 n’est nécessaire. Le champ existant `DailyTarget.calculationWeightKg` contient la moyenne retenue. Les nouveaux objectifs quotidiens utilisent la version de calcul `2`, tandis que les snapshots d’activités restent en version `1` jusqu’à U2B.2.

Les journées passées déjà enregistrées restent inchangées tant qu’aucune correction explicite ne les vise.

## Limites volontaires de cette sous-phase

U2B.1 ne modifie pas encore :

- les calories MET brutes ou nettes ;
- le poids utilisé lors de la création d’un snapshot d’activité ;
- la cohérence entre objectif et variation signée ;
- les activités planifiées ;
- la réconciliation prévu/réalisé ;
- la synchronisation des pas ;
- les métadonnées détaillées persistées sur l’origine du poids.

Ces éléments restent prévus dans les sous-phases U2B.2 à U2B.6.
