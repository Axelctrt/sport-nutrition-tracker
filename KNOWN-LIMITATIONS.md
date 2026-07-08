# Limitations connues — SportPilot 0.29.0

## Réseau volontairement privé

La recherche reste exacte par handle complet. SportPilot ne propose ni annuaire public, ni suggestions, ni recherche approximative, ni import automatique de contacts.

## Interactions sociales hors périmètre

La version 0.29.0 ne contient pas de likes, réactions, commentaires, messagerie, groupes, défis partagés ou classements. Ces fonctions demanderaient des règles supplémentaires de modération, de notification et de confidentialité.

## Pas de graphique cardio partagé

Les graphiques sociaux ne sont pas affichés tant qu’une véritable série temporelle filtrée et autorisée n’est pas disponible. Les métriques ponctuelles existantes peuvent être partagées selon la sélection de l’utilisateur.

## Données affichées uniquement lorsqu’elles existent

RPE, calories, fréquence cardiaque, cadence, dénivelé, repos ou intervalles ne sont visibles que lorsqu’ils sont présents dans l’activité source et autorisés pour l’ami concerné.

## Dépendance aux services cloud

Les fonctions sociales réelles nécessitent :

- une session Dexie Cloud valide ;
- les Pages Functions déployées ;
- le binding D1 `SOCIAL_DIRECTORY_DB` ;
- la disponibilité de Cloudflare et du réseau.

En cas d’indisponibilité, les caches locaux valides peuvent rester visibles, mais les nouvelles opérations distantes attendent le retour du service.

## Synchronisation multi-appareil

Le serveur reste la référence pour les amitiés et permissions. Une brève latence peut exister entre deux appareils avant actualisation. Les réponses anciennes sont ignorées lorsqu’une mutation plus récente a déjà été confirmée.

## Suppression et historique distant

Le retrait d’un ami révoque l’accès courant et les snapshots deviennent inaccessibles. Les journaux techniques propres à l’hébergeur ne constituent pas une fonction utilisateur et suivent les politiques de rétention du fournisseur.

## Stockage local et sauvegarde

La sauvegarde JSON v9 conserve les données locales prévues par son schéma. Elle ne remplace pas D1 comme source autoritaire pour les relations sociales distantes et ne doit pas servir à recréer artificiellement une ancienne permission.

## Estimation nutritionnelle

L’analyse photo nutritionnelle reste une estimation non médicale. Elle dépend du service configuré et nécessite toujours une validation manuelle avant ajout au journal.
