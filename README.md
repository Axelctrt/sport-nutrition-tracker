# SportPilot 0.27.0

SportPilot 0.27.0 livre la première tranche sociale exploitable : identité publique, demandes d’amis compatibles avec de vrais utilisateurs, permissions de partage par ami, snapshots sociaux filtrés et premier fil d’activité amis. Le périmètre reste volontairement strict : pas de messagerie, pas de likes, pas de commentaires, pas de groupes, pas de classements et aucun export d’activité brute.


## Préparation cloud social 0.28.0

La branche 0.28.0 prépare le backend social réel sans ouvrir d’annuaire public. F1 définit le contrat cloud social global. F2 ajoute les identités cloud et les réservations de handles. F3 branche la recherche exacte. F4 ajoute les demandes d’amis cloud dans le runtime Dexie Cloud v12 via `socialIdentities`, `socialHandleReservations` et `socialFriendRequests`.

Le handle reste un identifiant public de recherche exacte. Les relations futures resteront basées sur le `userId` stable. Le flag `VITE_ENABLE_REAL_SOCIAL_CLOUD` conserve l’activation réelle sous contrôle.

## Identité sociale

- identifiant public SportPilot visible et copiable, affiché avec `@` ;
- `userId` interne stable et privé, distinct du handle public ;
- validation stricte du handle public ;
- recherche exacte préparée par contrat branchable ;
- état explicite lorsque le backend social réel est indisponible.

## Demandes d’amis

- champ d’ajout par identifiant SportPilot exact ;
- gestion des états `trouvé`, `identifiant inexistant`, `service indisponible` ;
- blocage des demandes vers soi-même ;
- blocage des amis déjà existants ;
- blocage des demandes déjà envoyées ou déjà reçues ;
- persistance locale des données sociales.

## Confidentialité et partage

- permissions de partage réglables ami par ami ;
- résumé par défaut ;
- détail uniquement après consentement explicite local ;
- garde-fou social maintenu pour éviter tout partage détaillé non consenti ;
- génération de snapshots sociaux filtrés sans exposer l’activité privée complète.

## Fil d’activité amis

Le fil d’activité amis de 0.27.0 lit uniquement des snapshots sociaux filtrés. Il distingue résumé et détail autorisé, gère les états vides et dégrade les snapshots détaillés vers le résumé si la permission ami ne permet plus le détail. Le fil ne lit jamais une activité brute complète.

## Stockage et sauvegarde

La base métier utilise Dexie v10 avec la table `friendActivityPermissions`. La sauvegarde utilise le format JSON v9 et conserve les données sociales locales : identité, amis, demandes, préférences et permissions par ami. Le runtime Dexie Cloud reste disponible pour le socle existant, mais la synchronisation sociale réelle n’est pas activée dans cette version.

## IA photo nutritionnelle

Le parcours IA Gemini livré précédemment reste disponible. La clé Gemini reste côté serveur, le consentement photo reste obligatoire avant envoi externe, et le fallback local reste actif si Gemini, le proxy ou les quotas échouent.

## Arbitrage bundle

Le budget JavaScript reste aligné sur le périmètre accepté pour l’UX photo, IA, synchronisation et social. L’optimisation du bundle reste un chantier technique séparé.

## SportPilot 0.28.0 F3 — Recherche exacte cloud

La recherche exacte utilisateur cloud est préparée sur les identités sociales F2. Elle retourne uniquement `found`, `notFound`, `invalidHandle` ou `unavailable`. Aucun annuaire public, aucune suggestion, aucun matching partiel et aucune relation sociale automatique ne sont activés.

## SportPilot 0.28.0 F4 — Demandes d’amis cloud

Les demandes d’amis cloud sont préparées via `socialFriendRequests`. La recherche exacte F3 résout le handle, puis la demande est envoyée vers le `userId` distant. Les statuts `pending`, `accepted`, `declined` et `cancelled` sont structurés, sans créer encore d’amitié cloud automatique, sans permissions distribuées et sans snapshots distants.

