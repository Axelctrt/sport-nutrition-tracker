# Retour arrière — SportPilot 0.29.0

Le fix-forward reste la stratégie prioritaire. SportPilot 0.29.0 utilise des données sociales réelles dans Cloudflare D1 ; une régression front ne doit donc pas conduire à supprimer les tables ou à rejouer des migrations déjà appliquées.

## Incident de déploiement front

1. identifier le dernier déploiement Cloudflare Pages stable ;
2. restaurer temporairement ce déploiement depuis Cloudflare ;
3. conserver D1, Dexie v10 et le format de sauvegarde JSON v9 ;
4. ouvrir une branche corrective depuis `main` ;
5. republier un correctif avec les contrôles de sécurité A24 et de recette A25.

## Incident sur les routes sociales

1. ne jamais contourner l’authentification Bearer ;
2. désactiver temporairement l’accès au module par fix-forward si nécessaire ;
3. conserver les réponses `401` et `403` pour les accès non autorisés ;
4. ne pas exposer les erreurs SQL, stacks ou identifiants internes ;
5. vérifier les bindings Pages Functions et `SOCIAL_DIRECTORY_DB` avant toute modification de données.

## Incident de partage ou de confidentialité

1. privilégier la révocation du partage concerné ;
2. conserver le mode Aucun comme arrêt immédiat du partage ;
3. vérifier l’amitié active et la permission dans D1 ;
4. supprimer uniquement les snapshots concernés si une correction de données est indispensable ;
5. ne jamais créer d’export ou de table d’activités brutes.

## Incident de synchronisation

1. ne pas vider le cache local sur une simple indisponibilité serveur ;
2. conserver l’outbox locale pour permettre la reprise ;
3. vérifier la reconnexion et l’isolation du compte actif ;
4. préférer un correctif de reprise à une suppression globale des données locales.

## Migrations

- ne pas rejouer `0002_social_friend_permission_fields_0_29_0.sql` ;
- ne pas supprimer les colonnes `field_selection_json` ;
- A26 n’ajoute aucune migration D1 ou Dexie ;
- toute migration corrective future doit être additive, versionnée et testée sur une base de copie.

## Après restauration

Relancer au minimum :

```text
npm run audit:social-security-hardening
npm run audit:social-complete-acceptance
npm run audit:social-release-finalization
npm run build
```

Puis vérifier avec deux comptes que l’accès retiré ne revient pas et que les routes anonymes répondent toujours `401`.
