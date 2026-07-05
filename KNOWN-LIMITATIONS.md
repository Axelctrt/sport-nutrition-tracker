# Limitations connues — SportPilot 0.26.0

## Partage social détaillé volontairement bloqué

SportPilot 0.26.0 prépare les préférences sociales mais ne livre pas encore le partage détaillé d’activité. Le mode “Détaillé après accord” peut être enregistré comme intention utilisateur, mais l’application le limite à un résumé tant que le consentement explicite par ami n’est pas disponible.

## Synchronisation sociale cloud non activée

Les amis, demandes et préférences sont persistés localement dans Dexie v9 et inclus dans la sauvegarde JSON v8. Ils ne sont pas encore synchronisés réellement entre comptes via Dexie Cloud. Le runtime Dexie Cloud reste en v10 pour les autres fondations, mais le social reste local en 0.26.0.

## Restauration et conflits sociaux

La sauvegarde JSON v8 restaure les données sociales locales. Les stratégies de conflit multi-appareil, invitations croisées, consentements par ami et historique partagé sont réservés à 0.27.0 ou à une version ultérieure.

## Estimation nutritionnelle non médicale

L’analyse photo IA propose une estimation approximative. Elle ne doit pas être présentée comme un diagnostic nutritionnel, une mesure médicale ou une vérité absolue. La correction manuelle reste obligatoire avant l’ajout au journal.

## Dépendance au Free Tier Gemini

Le parcours photo IA Gemini livré en 0.25.1 reste soumis aux quotas Google, aux limites de débit et à la disponibilité du compte utilisé. Si le quota est atteint ou si Gemini répond mal, l’app doit revenir au fallback local.

## Secrets serveur uniquement

Les clés `PHOTO_NUTRITION_AI_API_KEY` ou `GEMINI_API_KEY` doivent rester côté serveur, dans le terminal du proxy local ou dans les variables d’environnement de l’hébergeur. Elles ne doivent jamais être placées dans React, dans une variable `VITE_*`, dans Git, ni dans un fichier `.env.local` destiné au front.

## Bundle JavaScript

La version 0.26.0 conserve le budget JavaScript accepté pour l’UX photo, IA et confidentialité sociale. L’optimisation du bundle doit être traitée plus tard comme chantier technique global.
