# Assistant quotidien : dashboard 0.33.0

## Portée

Cette phase branche les services de coaching quotidien au dashboard principal :

- résumé immédiat de la cible alimentaire guidée et de la dépense finale ;
- distinction visuelle entre pas attendus, objectif de pas et pas réels ;
- parcours en quatre étapes : check-in, décision sportive, nutrition et check-out ;
- mise en avant d'une seule prochaine action sans masquer les autres ;
- cartes terminées compactes et modifiables ;
- panneaux de saisie adaptés au mobile.

## Check-in

Le check-in reste court et entièrement facultatif. Il permet de saisir ou d'ignorer
la pesée, puis d'ajouter le sommeil, l'état général, le tour de taille et un contexte
ponctuel. Une réponse isolée ne modifie jamais directement la cible calorique.

## Sport et nutrition

La décision sportive propose le repos, une ou plusieurs activités, ou une décision
reportée. Le choix d'activités réutilise les parcours canoniques de musculation,
course, natation, vélo et planification.

La carte nutrition ouvre directement le repas pertinent, le scan, l'ajout rapide ou
le journal complet. Elle restitue les calories et protéines déjà enregistrées.

## Check-out

Le bilan du soir accepte les pas réels ou leur absence explicite, la faim, l'énergie,
la confirmation du journal et le contexte de la journée. L'absence de pas ne fabrique
pas une dépense finale fondée sur zéro pas.

## Priorisation

L'assistant sélectionne la prochaine action selon cet ordre :

1. check-in non terminé ;
2. décision sportive non confirmée ;
3. check-out non terminé à partir de 18 h ;
4. journal alimentaire incomplet ;
5. check-out de fin de journée.

## Vérifications

Les tests de composants couvrent les priorités, les trois formulaires, les états
terminés et l'absence de valeur de pas artificielle. Un parcours Playwright WebKit
contrôle le check-in sur le viewport iPhone 15, le focus du panneau et l'absence de
débordement horizontal.
