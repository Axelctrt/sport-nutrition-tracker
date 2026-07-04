# SportPilot 0.25.1 F1 — Contrat IA photo sécurisé

## Objectif

Cette phase prépare le branchement d’une vraie analyse IA pour l’estimation nutritionnelle par photo sans exposer de clé dans la PWA.

La version 0.25.0 reste le socle : sélection photo, aperçu, suppression, fallback local, correction manuelle et ajout au journal. La 0.25.1 F1 ajoute uniquement le contrat front/proxy et les garde-fous nécessaires avant de brancher un fournisseur IA réel.

## Architecture retenue

```text
PWA SportPilot
  └─ consentement explicite utilisateur
      └─ POST multipart/form-data vers VITE_PHOTO_NUTRITION_AI_ENDPOINT
          └─ backend/proxy sécurisé
              └─ fournisseur IA avec clé serveur uniquement
```

La clé IA ne doit jamais être placée dans :

```text
- une variable VITE_* ;
- le bundle JavaScript ;
- le dépôt Git ;
- l’URL du endpoint ;
- localStorage, IndexedDB ou Dexie.
```

## Variables front autorisées

```env
VITE_PHOTO_NUTRITION_AI_ENDPOINT=/api/photo-nutrition/analyze
VITE_PHOTO_NUTRITION_AI_TIMEOUT_MS=15000
```

`VITE_PHOTO_NUTRITION_AI_ENDPOINT` doit pointer vers une route relative du backend ou une URL HTTPS. Le client refuse les URLs HTTP publiques et les URLs contenant des paramètres sensibles comme `api_key`, `token`, `secret`, `client_secret` ou `access_token`.

## Contrat proxy attendu

Requête :

```text
POST /api/photo-nutrition/analyze
Content-Type: multipart/form-data
photo=<fichier image>
contractVersion=sportpilot-photo-nutrition-v1
```

Réponse :

```json
{
  "estimate": {
    "name": "Pâtes au poulet",
    "amount": 320,
    "nutrition": {
      "caloriesKcal": 720,
      "proteinGrams": 42,
      "carbohydratesGrams": 82,
      "fatGrams": 20
    }
  },
  "confidence": "medium",
  "warnings": ["Portion estimée à partir de la photo."]
}
```

## UX et confidentialité

La page photo affiche un bloc `Analyse IA sécurisée`.

- si aucun proxy n’est configuré, l’utilisateur garde le fallback local ;
- si un proxy est configuré, l’utilisateur doit cocher un consentement explicite avant l’envoi ;
- le résultat IA reste à vérifier et à corriger manuellement ;
- la photo n’est pas conservée dans le journal alimentaire ;
- une indisponibilité réseau ou backend doit laisser une issue claire : utiliser le fallback local.

## Limites de F1

Cette phase ne livre pas encore de backend IA complet. Elle prépare le contrat sécurisé et vérifie que le front est prêt à parler à un proxy.

## Tests et audits

Fichiers couverts :

```text
src/application/photo-nutrition/photoNutritionAiClient.ts
src/application/photo-nutrition/photoNutritionAiClient.test.ts
src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx
src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx
scripts/audit-photo-ai.mjs
```

Aucune migration Dexie n’est nécessaire.
