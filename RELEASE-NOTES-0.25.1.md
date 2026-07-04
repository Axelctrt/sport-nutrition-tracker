# SportPilot 0.25.1

## Nouveautés

- Activation de l’analyse nutritionnelle photo via un proxy Gemini Free Tier.
- Ajout d’un endpoint backend `/api/photo-nutrition/analyze` compatible Cloudflare Pages Functions.
- Ajout d’un proxy local Node pour tester Gemini en développement.
- Préremplissage du formulaire nutrition à partir de la réponse IA.
- Conservation du fallback local si le proxy, Gemini ou les quotas échouent.

## Sécurité et confidentialité

- Aucune clé IA n’est exposée dans la PWA.
- Les clés `PHOTO_NUTRITION_AI_API_KEY` ou `GEMINI_API_KEY` restent côté serveur.
- La photo n’est envoyée qu’après consentement explicite.
- La documentation précise la limite du Free Tier Gemini : les contenus transmis peuvent être utilisés par Google pour améliorer ses produits.

## Technique

- Version applicative : `0.25.1`.
- Base Dexie : v8.
- Sauvegarde JSON : v7.
- Registre local des espaces : v1.
- Runtime Dexie Cloud : v10.
- Aucune migration de données.

## Contrôles

- Tests client IA photo.
- Tests proxy Gemini.
- Audit photo nutrition.
- Audit photo IA.
- Build, check complet et test de stabilité attendus avant publication.
