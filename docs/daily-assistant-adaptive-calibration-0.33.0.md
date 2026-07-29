# Assistant quotidien : calibration adaptative 0.33.0

## Portée

Cette phase remplace la décision hebdomadaire fondée principalement sur la variation
du poids par une évaluation multi-signal. Le workflow existant est conservé :

- SportPilot calcule et explique une proposition ;
- aucune correction n'est appliquée automatiquement ;
- l'utilisateur accepte ou refuse explicitement ;
- une acceptation devient effective au début de la semaine suivante.

## Fenêtre et garde-fous

- Fenêtre standard : 21 jours calendaires.
- Durée minimale de suivi : 14 jours.
- Pesées exploitables : au moins 6 sur la période.
- Journées alimentaires complètes et comparables : au moins 10.
- Écart moyen entre consommation et cible : 15 % maximum.
- Délai entre deux corrections acceptées : 14 jours minimum.
- Correction ordinaire : 50 ou 100 kcal par jour.
- Limites hebdomadaire et cumulative : réglages existants de l'application.

Une proposition reste à zéro lorsqu'un garde-fou n'est pas satisfait.

## Signaux exploités

L'évaluation croise les sources canoniques déjà présentes :

- tendance robuste du poids sur la fenêtre ;
- tour de taille facultatif ;
- calories consommées et complétude du journal ;
- atteinte de la cible protéique ;
- pas attendus et pas réels ;
- faim, énergie, état général et sommeil ;
- contextes temporaires des check-ins et check-outs ;
- régularité des séances de musculation ;
- historique des ajustements acceptés.

Les pesées manifestement isolées sont exclues de la tendance par médiane et écart
absolu médian. La médiane des poids de la fenêtre sert de référence au rythme cible.

## États explicables

Le moteur peut conclure notamment :

- données insuffisantes ou suivi alimentaire insuffisant ;
- progression conforme ;
- variation temporaire probable ;
- recomposition probable ;
- signaux contradictoires ;
- activité inférieure aux prévisions ;
- récupération dégradée ;
- plateau probable ;
- cible probablement trop élevée ou trop faible ;
- perte ou prise plus rapide que prévu.

Une recomposition, des signaux contradictoires, un contexte temporaire ou une
activité nettement inférieure aux prévisions ne déclenchent pas de baisse calorique.

## Confiance

Quatre composantes internes sont calculées : poids, alimentation, activité et
récupération. L'interface n'affiche pas les scores techniques ; elle restitue
seulement l'un des niveaux suivants :

- données insuffisantes ;
- tendance encore incertaine ;
- tendance exploitable ;
- analyse fiable.

La règle des 7 700 kcal par kilogramme reste enregistrée comme indicateur brut pour
la transparence, mais elle ne décide jamais seule d'une correction.

## Compatibilité

L'évaluation est stockée dans le champ optionnel `WeeklyReview.adaptation`.
Aucune nouvelle table ni migration Dexie n'est nécessaire. Les anciens bilans,
sauvegardes et données synchronisées sans ce champ restent valides.

Le schéma de sauvegarde valide le nouveau contrat. Les listes de check-ins et
check-outs utilisent les index de date déjà présents.

## Limites connues

La régularité des séances de force est disponible, mais la progression de performance
par exercice n'est pas encore injectée dans cette version. La recomposition reste
donc qualifiée de probable et ne provoque jamais seule une correction.
