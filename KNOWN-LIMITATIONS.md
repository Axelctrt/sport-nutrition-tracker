# Limitations connues — SportPilot 0.28.0

## Cloud social réel sous contrôle

SportPilot 0.28.0 prépare le backend social cloud réel avec identités, handles réservés, recherche exacte, demandes d’amis, amitiés, permissions et snapshots sociaux distants filtrés. L’activation reste contrôlée par `VITE_ENABLE_REAL_SOCIAL_CLOUD` et par la configuration Dexie Cloud disponible.

## Pas d’annuaire public

La recherche utilisateur reste strictement exacte. Il n’y a pas de suggestions, pas de découverte publique d’utilisateurs, pas d’annuaire ouvert et pas de recherche globale.

## Relations basées sur userId

Les handles publics servent à trouver un utilisateur exact. Les demandes, amitiés, permissions et snapshots sociaux cloud restent basés sur `userId`, jamais sur le handle public comme clé relationnelle.

## Partage contrôlé

Les permissions par ami utilisent le résumé par défaut. Le détail n’est autorisé qu’après consentement explicite. Les snapshots détaillés peuvent être dégradés en résumé si la permission n’est plus suffisante.

## Aucun export d’activité brute

Le feed amis ne lit que des snapshots sociaux filtrés. Les activités privées complètes, notes libres, champs internes, horaires précis non nécessaires, calculs techniques et données sensibles ne doivent pas être exposés dans le cloud social.

## Interactions sociales hors périmètre

La version 0.28.0 ne livre pas les likes, commentaires, messagerie, groupes, classements ou réactions. Ces fonctionnalités nécessiteraient de nouveaux contrats de modération, confidentialité et stockage.

## Restauration et conflits sociaux

La sauvegarde JSON v9 conserve les données sociales locales. Les stratégies fines de conflit multi-appareil, de modération et de révocation rétroactive de snapshots déjà publiés devront être traitées dans une version ultérieure.

## Estimation nutritionnelle non médicale

L’analyse photo IA propose une estimation approximative. Elle ne doit pas être présentée comme un diagnostic nutritionnel, une mesure médicale ou une vérité absolue. La correction manuelle reste obligatoire avant l’ajout au journal.

## Dépendance au Free Tier Gemini

Le parcours photo IA Gemini reste soumis aux quotas Google, aux limites de débit et à la disponibilité du compte utilisé. Si le quota est atteint ou si Gemini répond mal, l’app doit revenir au fallback local.

## Secrets serveur uniquement

Les clés `PHOTO_NUTRITION_AI_API_KEY` ou `GEMINI_API_KEY` doivent rester côté serveur, dans le terminal du proxy local ou dans les variables d’environnement de l’hébergeur. Elles ne doivent jamais être placées dans React, dans une variable `VITE_*`, dans Git, ni dans un fichier `.env.local` destiné au front.

## Bundle JavaScript

La version 0.28.0 conserve le budget JavaScript accepté pour l’UX photo, IA, synchronisation et social. L’optimisation du bundle doit être traitée plus tard comme chantier technique global.

## Social cloud réel — activation contrôlée 0.28.1 F1

Le cloud social réel reste désactivé par défaut dans la configuration publique. Il peut être activé par environnement avec `VITE_ENABLE_REAL_SOCIAL_CLOUD=true`, idéalement d’abord sur Cloudflare Preview avec des comptes de test. La production doit rester à `false` tant que la recette multi-comptes et les règles d’accès ne sont pas validées.
