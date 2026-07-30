# Limitations connues — SportPilot 0.35.0

## Données et analyses

Les graphiques restent volontairement absents lorsque les données disponibles ne permettent pas une comparaison fiable. SportPilot n’invente ni fréquence cardiaque, ni fatigue, ni motivation lorsque ces valeurs ne sont pas stockées. Les signaux de récupération se limitent aux champs réellement déclarés : énergie, préparation, sommeil et faim.

## Moteur calorique

La version 0.35.0 ne modifie pas les formules de calories, macros, métabolisme ou ajustement hebdomadaire.

## Social

Les contrats sociaux restent ceux de la version 0.29.0. La version 0.35.0 améliore l’accès aux sections Amis, mais n’ajoute pas d’annuaire public, likes, commentaires, messagerie, groupes, défis partagés ou classements.

## Photo nutrition

L’analyse photo reste soumise au consentement explicite par image, à un compte connecté et à la disponibilité du service. Une analyse indisponible ne produit aucune estimation.

## Accessibilité

La recette 0.35.0 couvre clavier, focus, alternatives textuelles, réduction des animations, zones sûres iOS et comportement tactile WebKit. Les lecteurs d’écran tiers peuvent varier selon le navigateur, le système et les réglages utilisateur.

## Dépendances

`npm audit fix` a appliqué toutes les mises à jour compatibles disponibles. L’audit npm conserve 13 signalements hauts, dont 5 dans l’arbre de production :

- `GHSA-qwww-vcr4-c8h2` concerne le mode React Server Components de React Router. SportPilot est une PWA Vite cliente et n’utilise ni RSC ni actions serveur React ;
- quatre CVE libvips remontent par les dépendances optionnelles `sharp`/`ndarray-pixels` de Quagga 2. Ces modules ne sont présents dans aucun asset du build navigateur ;
- les autres signalements concernent `brace-expansion` dans la chaîne de build Workbox/Vite PWA.

Au 29 juillet 2026, npm ne propose pour ces chaînes que des rétrogradations forcées de React Router, Quagga 2 ou Vite PWA. Elles ne sont pas appliquées sans recette dédiée du routeur, du scanner et du cycle de mise à jour PWA. Ces alertes doivent être réévaluées dès la publication de correctifs amont compatibles.
