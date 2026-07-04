# SportPilot 0.25.1 — analyse photo nutritionnelle IA Gemini

Branche de publication : `feature/photo-ai-0.25.1`

La version 0.25.1 transforme le socle photo 0.25.0 en parcours IA réel, sans clé exposée dans la PWA.

## Contenu livré

- contrat front/proxy pour l’analyse nutritionnelle photo ;
- endpoint configuré par `VITE_PHOTO_NUTRITION_AI_ENDPOINT` ;
- proxy backend `/api/photo-nutrition/analyze` compatible Cloudflare Pages Functions ;
- proxy local Node `npm run dev:photo-ai-proxy` ;
- fournisseur Gemini Free Tier par défaut ;
- variable serveur `PHOTO_NUTRITION_AI_API_KEY`, alias `GEMINI_API_KEY` ;
- consentement explicite avant envoi de la photo ;
- fallback local automatique si Gemini ou le proxy échoue ;
- audits `audit:photo-ai` et `audit:photo-nutrition` intégrés au contrôle complet.

## Versions techniques

- application : `0.25.1` ;
- base Dexie : v8 ;
- sauvegarde JSON : v7 ;
- registre local des espaces : v1 ;
- runtime Dexie Cloud : v10 ;
- aucune migration de données.

## Validation attendue

La publication doit être validée sur ordinateur et iPhone 15 sous iOS 26 avec :

- analyse locale sans endpoint ;
- analyse IA Gemini avec clé serveur ;
- fallback local si le proxy est coupé ;
- ajout au bon repas ;
- Open Food Facts et scanner code-barres non régressifs ;
- absence de secret dans Git.

Tag attendu à la publication : `v0.25.1`.
