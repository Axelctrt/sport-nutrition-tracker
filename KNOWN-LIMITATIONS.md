# Limitations connues — SportPilot 0.25.1

## Estimation nutritionnelle non médicale

L’analyse photo IA propose une estimation approximative. Elle ne doit pas être présentée comme un diagnostic nutritionnel, une mesure médicale ou une vérité absolue. La correction manuelle reste obligatoire avant l’ajout au journal.

## Dépendance au Free Tier Gemini

SportPilot 0.25.1 utilise Gemini Free Tier pour éviter un coût OpenAI immédiat. Ce choix implique des quotas, des limites de débit et une disponibilité dépendante du compte Google utilisé. Si le quota est atteint ou si Gemini répond mal, l’app doit revenir au fallback local.

## Confidentialité Free Tier

Sur le Free Tier Gemini, les contenus transmis au fournisseur IA peuvent être utilisés par Google pour améliorer ses produits. L’utilisateur doit donc éviter les photos sensibles et donner son consentement explicite avant tout envoi externe.

## Secrets serveur uniquement

Les clés `PHOTO_NUTRITION_AI_API_KEY` ou `GEMINI_API_KEY` doivent rester côté serveur, dans le terminal du proxy local ou dans les variables d’environnement de l’hébergeur. Elles ne doivent jamais être placées dans React, dans une variable `VITE_*`, dans Git, ni dans un fichier `.env.local` destiné au front.

## Bundle JavaScript

La version 0.25.1 peut conserver le dépassement du budget JavaScript historique accepté en 0.25.0 pour l’UX photo. L’optimisation du bundle doit être traitée plus tard comme chantier technique global.

## Données locales

La branche 0.26.0 ajoute les tables locales d’amis : base métier Dexie v9, sauvegarde JSON v8, registre local des espaces v1 et runtime Dexie Cloud v10. Le partage social reste local et non synchronisé entre comptes.
