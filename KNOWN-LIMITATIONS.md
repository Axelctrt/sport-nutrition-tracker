# Limitations connues — SportPilot 1.0.0-rc.1

Ces limitations sont des dettes séparées. Elles ne sont pas corrigées par la
préparation RC et nécessitent leur propre validation avant toute modification.

## Photos de progression

Les photos restent privées et locales au navigateur et à l’espace de données ouvert. Elles ne sont ni synchronisées dans le cloud, ni publiées socialement, ni incluses dans la sauvegarde JSON générale. Leur transfert entre appareils exige l’archive photo séparée et une restauration volontaire.

## Amis — référence historique 0.37.0

Le statut `Vérification…`, `Identifiant disponible` ou `Identifiant indisponible` est encore affiché sous les actions du profil public. Son déplacement immédiatement sous le champ d’identifiant est une amélioration UX non bloquante planifiée pour une prochaine passe.

Cette observation décrit la stable `0.37.0`. La convergence ultérieure du
parcours Amis a été intégrée dans `develop` par #24 ; elle n'est donc plus une
limitation active de la candidate.

## Données et analyses

Les graphiques restent absents lorsque les données disponibles ne permettent pas une comparaison fiable. SportPilot n’invente ni fréquence cardiaque, ni fatigue, ni motivation lorsque ces valeurs ne sont pas stockées.

## Moteur calorique

La candidate `1.0.0-rc.1` ne modifie pas les formules de calories, macros, métabolisme ou ajustement hebdomadaire.

## Social

Les contrats sociaux restent ceux de la version 0.29.0. La candidate améliore les parcours Amis sans ajouter d’annuaire public, likes, commentaires, messagerie, groupes, défis partagés, classements ou export d’activité brute.

## Photo nutrition

L’analyse photo nutritionnelle reste distincte des photos de progression. Elle exige un consentement explicite par image, un compte connecté et la disponibilité du service ; une analyse indisponible ne produit aucune estimation. Le diagnostic Preview reste suivi séparément dans #103.

## Portabilité des tests

#136 suit le faux négatif Windows/CRLF du contrat source Data. Aucun comportement
produit de `SelectiveBackupRestorePanel` n'est remis en cause par cette dette.

## Couverture Corbeille

#137 suit l'ajout futur d'une preuve responsive/E2E légère de la Corbeille,
notamment aux largeurs 320, 360 et 412 px. Aucune refonte n'est incluse.

## Infrastructure Cloudflare

#138 suit le diagnostic des deux Workers Builds rouges. Les GitHub Actions
applicatives sont vertes et aucune causalité avec #103 n'est démontrée. Cette
candidate n'autorise aucune action Cloudflare.

## Accessibilité

La recette automatisée couvre clavier, focus, réduction des animations, zones sûres iOS et formats mobiles. Le comportement final des lecteurs d’écran et des claviers virtuels doit aussi être vérifié sur les appareils réels.

## Dépendances

Les alertes `npm audit` compatibles sont traitées sans mise à niveau forcée. Les signalements amont restants doivent être réévalués dès la publication de correctifs compatibles avec React Router, Quagga 2 et la chaîne PWA.

La qualification du 11 août 2026 consignée dans #141 sur le verrou courant
signale 9 vulnérabilités hautes et 0 critique : React Router 7.18.1, Sharp via
Quagga 2, puis Brace Expansion, Fast URI, Nanoid et Undici dans les chaînes de
build/test/PWA. Elle autorise la recette de la candidate RC, sans constituer une
acceptation pour la stable. Aucune mise à jour forcée et aucun `npm audit fix`
ne sont appliqués. La publication stable `1.0.0` reste bloquée jusqu'au
traitement ou à l'acceptation explicite de #141.
