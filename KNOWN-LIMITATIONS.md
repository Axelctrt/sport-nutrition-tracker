# Limitations connues - SportPilot 0.37.0

## Photos de progression

Les photos restent privées et locales au navigateur et à l’espace de données ouvert. Elles ne sont ni synchronisées dans le cloud, ni publiées socialement, ni incluses dans la sauvegarde JSON générale. Leur transfert entre appareils exige l’archive photo séparée et une restauration volontaire.

## Amis

Le statut `Vérification…`, `Identifiant disponible` ou `Identifiant indisponible` est encore affiché sous les actions du profil public. Son déplacement immédiatement sous le champ d’identifiant est une amélioration UX non bloquante planifiée pour une prochaine passe.

## Données et analyses

Les graphiques restent absents lorsque les données disponibles ne permettent pas une comparaison fiable. SportPilot n’invente ni fréquence cardiaque, ni fatigue, ni motivation lorsque ces valeurs ne sont pas stockées.

## Moteur calorique

La version 0.37.0 ne modifie pas les formules de calories, macros, métabolisme ou ajustement hebdomadaire.

## Social

Les contrats sociaux restent ceux de la version 0.29.0. La version 0.37.0 améliore les parcours Amis sans ajouter d’annuaire public, likes, commentaires, messagerie, groupes, défis partagés, classements ou export d’activité brute.

## Photo nutrition

L’analyse photo nutritionnelle reste distincte des photos de progression. Elle exige un consentement explicite par image, un compte connecté et la disponibilité du service ; une analyse indisponible ne produit aucune estimation.

## Accessibilité

La recette automatisée couvre clavier, focus, réduction des animations, zones sûres iOS et formats mobiles. Le comportement final des lecteurs d’écran et des claviers virtuels doit aussi être vérifié sur les appareils réels.

## Dépendances

Les alertes `npm audit` compatibles sont traitées sans mise à niveau forcée. Les signalements amont restants doivent être réévalués dès la publication de correctifs compatibles avec React Router, Quagga 2 et la chaîne PWA.
