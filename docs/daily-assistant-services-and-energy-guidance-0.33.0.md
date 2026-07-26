# Assistant quotidien : services et guidage énergétique 0.33.0

## Portée

Cette phase rend le socle de données quotidien utilisable par la future interface :

- enregistrement ou modification d'un check-in ;
- décision sport du jour ;
- enregistrement ou modification d'un check-out ;
- réutilisation des sources canoniques pour le poids, les pas et le journal alimentaire ;
- estimation des pas attendus ;
- séparation entre cible calorique guidée et dépense finale estimée.

## Sources de vérité

Les objets de coaching ne recopient pas le poids ni les pas :

- `DailyCheckIn.weightEntryId` référence la pesée canonique du jour ;
- `DailyCheckOut.stepsEntryId` référence les pas canoniques du jour ;
- la confirmation du journal met à jour `DailyJournalStatus`.

Une valeur volontairement ignorée retire uniquement la référence du check-in ou du
check-out. Elle ne supprime pas une mesure canonique déjà enregistrée.

## Pas attendus

L'objectif de pas et les pas attendus sont deux notions distinctes.

- Moins de 7 jours observés : repli prudent selon le profil, plafonné par l'objectif.
- De 7 à 13 jours : transition progressive entre le repli et l'historique robuste.
- À partir de 14 jours : estimation fondée sur l'historique récent.
- Fenêtre : 28 jours calendaires.
- Robustesse : médiane, écart absolu médian et exclusion des valeurs aberrantes.
- Arrondi : 100 pas.

Chaque cible persistée conserve un `stepBasis` avec la valeur utilisée, l'objectif,
la source, le niveau de confiance et le nombre de jours observés.

## Deux lectures énergétiques

### Cible guidée

La cible quotidienne utilise :

- le poids de référence ;
- les pas attendus ;
- les activités réellement réalisées ;
- les activités encore prévues après réconciliation.

Une activité réalisée et liée à une séance prévue remplace sa projection. Une
séance annulée ou ignorée n'ajoute aucune calorie.

### Dépense finale

Après check-out, la dépense finale utilise :

- les pas réellement enregistrés ;
- les activités réellement enregistrées ;
- aucune activité encore seulement prévue.

Si le check-out existe sans pas réels, l'état est `missingSteps` et aucune dépense
finale trompeuse n'est fabriquée avec zéro pas.

## Version de calcul

`DAILY_TARGET_CALCULATION_VERSION` passe de 4 à 5. Les anciennes cibles conservent
leur version et restent lisibles. Le champ `stepBasis` est optionnel pour la
compatibilité des sauvegardes historiques.

## Vérifications

Les tests couvrent notamment :

- check-in avec ou sans pesée ;
- check-out avec ou sans pas ;
- synchronisation du statut du journal alimentaire ;
- décision sportive confirmée puis rouverte ;
- repli, apprentissage et historique établi pour les pas attendus ;
- exclusion d'une valeur de pas aberrante ;
- activité prévue, réalisée, annulée et encore prévue ;
- absence de double comptage dans la cible guidée ;
- exclusion de tout sport seulement prévu dans la dépense finale.
