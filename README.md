# SportPilot 0.29.0

SportPilot 0.29.0 finalise le module social privé de l’application. La version permet à deux comptes réels de se trouver par handle exact, de gérer une amitié bilatérale et de partager des activités sportives selon une permission définie séparément pour chaque ami.

L’application reste conçue en priorité pour un usage mobile, tout en conservant une utilisation complète sur ordinateur.

## Module social privé

- identité canonique liée au compte cloud authentifié ;
- nom public et handle unique ;
- recherche exacte, sans annuaire public ni suggestions ;
- demandes d’amis envoyées, reçues, annulées, refusées ou acceptées ;
- nettoyage des demandes arrivées dans un état terminal ;
- amitiés bilatérales canoniques et suppression depuis l’un ou l’autre compte ;
- recréation propre d’une relation précédemment supprimée.

## Partage des activités par ami

Le partage est configuré uniquement depuis la fiche de chaque ami :

- **Aucun** : aucune activité transmise ;
- **Résumé** : informations essentielles uniquement ;
- **Personnalisé** : champs autorisés explicitement pour cet ami.

Les champs détaillés disponibles couvrent notamment :

- musculation : exercices, séries, répétitions, charges, repos, RPE et volume ;
- cardio : durée, distance, allure, vitesse, dénivelé, calories, fréquence cardiaque, cadence et intervalles lorsque ces données existent.

Aucun réglage social global n’entre en concurrence avec ces permissions et aucun choix de partage n’est imposé pendant l’enregistrement d’une activité.

## Fil et fiche d’activité

- cartes adaptées aux activités de musculation et de cardio ;
- tri déterministe et absence de doublons ;
- mise à jour après modification d’une activité ;
- retrait après masquage, suppression ou révocation de permission ;
- fiche détaillée ouverte depuis le fil ;
- autorisation revérifiée côté serveur à chaque lecture du détail ;
- aucune activité métier brute transmise au client d’un ami.

## Résilience et sécurité

- cache local valide conservé pendant une indisponibilité réseau ;
- reprise automatique de l’outbox après reconnexion ou réouverture ;
- protection contre les réponses obsolètes et les changements rapides de permission ;
- isolation stricte lors d’un changement de compte ;
- authentification Bearer obligatoire sur toutes les routes sociales ;
- identité de l’appelant vérifiée côté serveur ;
- refus des identifiants forgés et des mutations pour un tiers ;
- accès révoqué après suppression d’une amitié ;
- réponses sociales non mises en cache et erreurs internes masquées.

## Stockage et versions techniques

- Application : `0.29.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Base sociale distante : Cloudflare D1.
- Contrat de snapshot social : `0.29.0-a3`.
- Collections cloud locales conservées : `socialIdentities`, `socialHandleReservations`, `socialFriendRequests`, `socialFriendships`, `socialFriendPermissions`, `socialActivitySnapshots`.
- Aucune collection `socialRawActivities`.

## Garde-fous de confidentialité

- pas d’annuaire public ;
- pas de suggestions d’utilisateurs ;
- pas de recherche approximative ;
- pas de likes, commentaires, messagerie, groupes ou classements ;
- pas de partage automatique ;
- pas d’export brut d’activité ;
- pas de notes privées ni de champs internes dans le fil social.

## Validation de la release

La publication doit être précédée de :

```text
npm run audit:social-complete-acceptance
npm run audit:social-release-finalization
npm run lint
npm run test
npm run build
npm run check
npm run test:stability
```

La recette réelle A25 sur ordinateur et iPhone 15 doit également être terminée avant la fusion dans `main`.

Tag attendu : `v0.29.0`.
