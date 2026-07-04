# SportPilot 0.25.1 F3 — Proxy IA photo Gemini Free Tier

## Décision produit

SportPilot 0.25.1 utilise un proxy IA photo basé sur Gemini Free Tier pour éviter un coût OpenAI immédiat.
Cette décision est adaptée à une application avec très peu d’utilisateurs et une fonctionnalité expérimentale.

Le Free Tier Gemini impose des quotas et Google indique que les contenus du Free Tier peuvent être utilisés pour améliorer ses produits. L’interface doit donc rester claire : l’utilisateur consent explicitement avant l’envoi d’une photo et ne doit pas utiliser de photo sensible.

## Architecture

```text
PWA SportPilot
→ VITE_PHOTO_NUTRITION_AI_ENDPOINT=/api/photo-nutrition/analyze
→ proxy backend SportPilot
→ Gemini API côté serveur
→ réponse JSON nutritionnelle
→ formulaire de correction manuelle
→ journal alimentaire
```

## Secrets

Aucune clé IA ne doit être placée dans le bundle front ou dans une variable `VITE_*`.

Variables serveur :

```text
PHOTO_NUTRITION_AI_PROVIDER=gemini
PHOTO_NUTRITION_AI_API_KEY=clé Gemini API
PHOTO_NUTRITION_AI_MODEL=gemini-2.5-flash-lite
```

Alias accepté : `GEMINI_API_KEY`.

## Endpoint

Route exposée :

```text
POST /api/photo-nutrition/analyze
```

Entrée : `multipart/form-data` avec un champ `photo`.

Réponse attendue par la PWA :

```json
{
  "estimate": {
    "name": "Assiette de riz et poulet",
    "amount": 350,
    "nutrition": {
      "caloriesKcal": 690,
      "proteinGrams": 44,
      "carbohydratesGrams": 78,
      "fatGrams": 18
    }
  },
  "confidence": "medium",
  "warnings": ["estimation expérimentale"]
}
```

## Garde-fous

- limite image : 8 Mo ;
- uniquement fichiers `image/*` ;
- clé IA côté serveur uniquement ;
- aucune persistance de photo dans le journal ;
- fallback local automatique côté PWA si le proxy ou Gemini échoue ;
- correction manuelle obligatoire avant validation.

## Développement local

Terminal proxy :

```powershell
$env:PHOTO_NUTRITION_AI_PROVIDER="gemini"
$env:PHOTO_NUTRITION_AI_API_KEY="TA_CLE_GEMINI_ICI"
$env:PHOTO_NUTRITION_AI_MODEL="gemini-2.5-flash-lite"
npm run dev:photo-ai-proxy
```

Terminal Vite :

```powershell
$env:VITE_PHOTO_NUTRITION_AI_ENDPOINT="/api/photo-nutrition/analyze"
$env:VITE_PHOTO_NUTRITION_AI_TIMEOUT_MS="30000"
npm run dev -- --host 127.0.0.1
```

## Migration

Aucune migration Dexie.
Aucun changement Open Food Facts.
Aucun changement scanner code-barres.
