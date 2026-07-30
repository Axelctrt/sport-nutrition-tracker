# Limitations connues - SportPilot 0.36.0

## Données et analyses

Les graphiques restent absents lorsque les données disponibles ne permettent pas une comparaison fiable. SportPilot n’invente ni fréquence cardiaque, ni fatigue, ni motivation lorsque ces valeurs ne sont pas stockées.

## Moteur calorique

La version 0.36.0 ne modifie pas les formules de calories, macros, métabolisme ou ajustement hebdomadaire.

## Social

Les contrats sociaux restent ceux de la version 0.29.0. La version 0.36.0 réorganise les parcours Amis, mais n’ajoute pas d’annuaire public, likes, commentaires, messagerie, groupes, défis partagés, classements ou export d’activité brute.

## Musculation

L’autosauvegarde protège les séries saisies dans l’application. Une fermeture forcée du navigateur ou du système avant l’événement de saisie ne peut pas être interceptée par une application web.

## Photo nutrition

L’analyse photo reste soumise au consentement explicite par image, à un compte connecté et à la disponibilité du service. Une analyse indisponible ne produit aucune estimation.

## Accessibilité

La recette automatisée couvre clavier, focus, réduction des animations, zones sûres iOS et formats mobiles. Le comportement final des lecteurs d’écran et des claviers virtuels doit aussi être vérifié sur les appareils réels.

## Dépendances

Les alertes `npm audit` compatibles sont traitées sans mise à niveau forcée. Les signalements amont restants doivent être réévalués dès la publication de correctifs compatibles avec React Router, Quagga 2 et la chaîne PWA.
