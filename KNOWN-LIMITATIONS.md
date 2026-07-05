# Limitations connues — SportPilot 0.27.0

## Synchronisation sociale cloud non activée

SportPilot 0.27.0 prépare les contrats et les états nécessaires aux vrais utilisateurs, mais ne branche pas encore de backend social réel. La recherche exacte d’un identifiant peut donc retourner un état de service cloud indisponible tant qu’un adapter cloud n’est pas fourni.

## Pas d’annuaire public

La recherche utilisateur reste volontairement exacte. Il n’y a pas de suggestions, pas de découverte publique d’utilisateurs, pas d’annuaire ouvert et pas de recherche globale.

## Partage contrôlé localement

Les permissions par ami sont persistées localement. Le résumé reste le niveau par défaut. Le détail n’est autorisé qu’après consentement explicite local et les snapshots détaillés peuvent être dégradés en résumé si la permission n’est plus suffisante.

## Aucun export d’activité brute

Le fil d’activité amis ne lit que des snapshots sociaux filtrés. Les activités privées complètes, notes libres, champs internes, horaires précis non nécessaires, calculs techniques et données sensibles ne doivent pas être exposés dans le feed.

## Interactions sociales hors périmètre

La version 0.27.0 ne livre pas les likes, commentaires, messagerie, groupes, classements ou réactions. Ces fonctionnalités nécessiteraient de nouveaux contrats de modération, confidentialité et stockage.

## Restauration et conflits sociaux

La sauvegarde JSON v9 restaure les données sociales locales. Les stratégies de conflit multi-appareil, invitations croisées réellement cloud, consentements distribués et historique social synchronisé restent à traiter dans une version ultérieure.

## Estimation nutritionnelle non médicale

L’analyse photo IA propose une estimation approximative. Elle ne doit pas être présentée comme un diagnostic nutritionnel, une mesure médicale ou une vérité absolue. La correction manuelle reste obligatoire avant l’ajout au journal.

## Dépendance au Free Tier Gemini

Le parcours photo IA Gemini reste soumis aux quotas Google, aux limites de débit et à la disponibilité du compte utilisé. Si le quota est atteint ou si Gemini répond mal, l’app doit revenir au fallback local.

## Secrets serveur uniquement

Les clés `PHOTO_NUTRITION_AI_API_KEY` ou `GEMINI_API_KEY` doivent rester côté serveur, dans le terminal du proxy local ou dans les variables d’environnement de l’hébergeur. Elles ne doivent jamais être placées dans React, dans une variable `VITE_*`, dans Git, ni dans un fichier `.env.local` destiné au front.

## Bundle JavaScript

La version 0.27.0 conserve le budget JavaScript accepté pour l’UX photo, IA, synchronisation et social. L’optimisation du bundle doit être traitée plus tard comme chantier technique global.
