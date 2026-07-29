# SportPilot 0.33.2

## Compte et synchronisation

- Distingue l’identité connectée de l’accès cloud réellement opérationnel.
- Prévalide la licence, le réseau et la session avant une synchronisation globale.
- Renouvelle une session Dexie Cloud au plus une fois avant de demander une reconnexion.
- Remplace les erreurs techniques 401/403 par des messages utilisateur en français.
- Unifie la dernière synchronisation réussie entre le centre et la page des appareils.

## Analyse photo

- Utilise des identifiants cloud asynchrones et validés avant tout envoi.
- Conserve la saisie manuelle lorsque le cloud est indisponible.
- Corrige le switch IA avec une piste de 48 x 28 px, un rond de 22 px,
  une marge interne de 3 px et une translation exacte de 20 px.

## Musculation

- Propose la création manuelle après une recherche d’exercice sans résultat.
- Normalise accents, casse et espaces pour prévenir les doublons.
- Affiche les exercices similaires avant de confirmer la création.
- Préremplit le nom et restaure le bon contexte de bibliothèque, séance ou modèle.
- Ajoute et met brièvement en évidence le nouvel exercice dans le parcours d’origine.

## Données

- Aucun schéma Dexie, format de sauvegarde ou moteur calorique n’est modifié.
- Aucune donnée locale n’est supprimée ou réinitialisée.

## Périmètre

- Aucun annuaire public, likes, commentaires, messagerie ou export d’activité brute
  n’est ajouté.

Branche : `fix/account-sync-ux-0.33.2`.
Déploiement : aucun déploiement inclus dans ce correctif.
