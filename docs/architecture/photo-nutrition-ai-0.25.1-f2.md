# SportPilot 0.25.1 F2 — Branchement IA photo via proxy

## Objectif

Cette phase branche réellement le parcours photo sur le contrat IA sécurisé préparé en F1, sans exposer de clé IA dans la PWA.

Le front reste volontairement agnostique du fournisseur IA. Il connaît uniquement un endpoint de proxy backend configuré via `VITE_PHOTO_NUTRITION_AI_ENDPOINT`.

## Flux utilisateur

```text
Photo sélectionnée
  ├─ aucune autorisation IA
  │   └─ analyse locale prudente 0.25.0
  └─ consentement IA explicite + endpoint configuré
      └─ POST multipart/form-data vers le proxy
          ├─ réponse valide
          │   └─ formulaire prérempli avec l’estimation IA distante
          └─ erreur / timeout / réponse invalide
              └─ fallback local appliqué automatiquement
```

## Contrat front/proxy

Requête :

```text
POST VITE_PHOTO_NUTRITION_AI_ENDPOINT
Content-Type: multipart/form-data
photo=<fichier image>
contractVersion=sportpilot-photo-nutrition-v1
```

Réponse attendue :

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

Le client refuse une réponse IA invalide lorsqu’elle ne contient pas d’estimation exploitable ou de valeurs nutritionnelles minimales.

## fallback automatique

Si l’appel distant échoue, le parcours utilisateur ne reste pas bloqué :

```text
- l’erreur IA est affichée comme information non bloquante ;
- le fallback local 0.25.0 est relancé automatiquement ;
- les warnings indiquent que l’IA distante est indisponible ;
- l’utilisateur conserve la correction manuelle avant ajout au journal.
```

Ce comportement couvre notamment :

```text
- proxy non disponible ;
- timeout ;
- HTTP 4xx / 5xx ;
- réponse JSON invalide ;
- payload incomplet ;
- refus de l’endpoint côté client.
```

## Confidentialité

Les règles de F1 restent obligatoires :

```text
- aucune clé IA dans une variable VITE_* ;
- aucun token dans l’URL du endpoint ;
- aucun header Authorization côté front ;
- envoi uniquement après consentement explicite ;
- photo non conservée dans Dexie ou le journal alimentaire ;
- correction manuelle obligatoire avant l’ajout.
```

## Impact technique

Fichiers principaux :

```text
src/application/photo-nutrition/photoNutritionAiClient.ts
src/application/photo-nutrition/photoNutritionAiClient.test.ts
src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx
src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx
scripts/audit-photo-ai.mjs
```

Aucune migration Dexie n’est nécessaire.
