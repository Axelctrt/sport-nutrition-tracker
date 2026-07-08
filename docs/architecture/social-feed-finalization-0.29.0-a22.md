# SportPilot 0.29.0 — A22 — Finalisation du fil social

## Objectif

A22 stabilise le fil d’activités avant les audits de résilience et de sécurité. La phase ne change pas le modèle de confidentialité : le navigateur continue de recevoir uniquement les snapshots filtrés par le serveur pour l’ami connecté.

## Comportement utilisateur

- Le premier chargement affiche un état simple et explicite.
- Une actualisation conserve les cartes déjà visibles jusqu’à la réponse du serveur.
- Le bouton d’actualisation indique clairement qu’une requête est en cours.
- L’état vide, l’état hors ligne et l’erreur réseau ont chacun un message distinct.
- Une erreur initiale propose une action **Réessayer**.
- Le bouton **Afficher plus d’activités** reste compact et empêche les requêtes concurrentes.
- Les cartes restent différenciées par type d’activité avec une icône et une tonalité dédiées.
- La position de lecture est conservée quand de nouvelles cartes sont insérées au-dessus du point visible.

## Ordre et déduplication

Le serveur trie les snapshots par :

1. date/heure réelle de l’activité lorsqu’elle est disponible ;
2. date de création stable du snapshot ;
3. identifiant du snapshot.

Une modification d’activité ne la remonte donc pas artificiellement dans le fil. Le client normalise également chaque page :

- une seule carte par `snapshotId` ;
- conservation de la révision la plus récente ;
- tri déterministe après pagination ou actualisation.

## Actualisation et suppressions

Une actualisation complète remplace la vue locale par la réponse courante du serveur. Une activité :

- supprimée ;
- devenue privée ;
- retirée par une permission `none` ;
- rendue inaccessible après suppression d’amitié ;

n’est plus conservée dans le fil après l’actualisation.

Si la fiche de cette activité est ouverte, elle est fermée dès que la carte disparaît ou que sa portée visible change.

## Concurrence réseau

Chaque requête du fil reçoit un numéro de séquence. Une réponse ancienne est ignorée si :

- une actualisation plus récente a démarré ;
- le compte actif a changé ;
- une pagination se termine après un remplacement complet du fil.

Un curseur qui ne progresse plus est neutralisé pour éviter une boucle de pagination.

## Isolation entre comptes

Lors d’un changement de compte, les cartes, le curseur et la fiche du compte précédent sont supprimés avant le chargement du nouveau fil. Une panne réseau sur le nouveau compte ne peut donc pas laisser visibles les activités de l’ancien compte.

## Détail d’activité

L’ouverture d’une fiche vérifie désormais aussi :

- la révision source ;
- la date de mise à jour ;
- le niveau de visibilité ;
- la famille et le type d’activité ;
- la sélection de champs autorisés.

Une fiche obsolète est refusée et l’utilisateur est invité à actualiser le fil.

## Cache et données

Les requêtes du fil, du détail et de readiness utilisent `cache: 'no-store'`. Les réponses serveur possèdent déjà l’en-tête `cache-control: no-store`.

Aucune activité brute, note privée ou donnée non autorisée n’est introduite par A22.

## Compatibilité

- Aucune migration D1.
- Aucune migration Dexie.
- Les anciens curseurs contenant `updatedAt` restent lisibles pendant la transition.
- Interface mobile-first, compatible ordinateur et iPhone avec les composants A21 existants.
