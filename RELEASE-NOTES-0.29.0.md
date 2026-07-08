# Notes de release — SportPilot 0.29.0

## Résumé

SportPilot 0.29.0 livre le module social privé complet. Deux utilisateurs authentifiés peuvent créer leur identité publique, se trouver par handle exact, devenir amis et partager des activités sportives avec un niveau de détail défini séparément pour chaque relation.

La version finalise également la persistance D1, la résilience hors ligne, la sécurité des routes et la recette réelle sur ordinateur et iPhone 15.

## Nouveautés principales

### Identité et demandes d’amis

- identité canonique réconciliée avec le compte cloud authentifié ;
- handle public unique distinct de l’identifiant privé ;
- recherche exacte uniquement ;
- demandes entrantes et sortantes ;
- annulation, refus et acceptation ;
- nettoyage des demandes terminales ;
- prévention des doublons et des demandes vers soi-même.

### Amitiés complètes

- relation bilatérale canonique ;
- cache local alimenté par la réponse serveur autoritaire ;
- suppression d’un ami depuis l’un ou l’autre compte ;
- révocation des permissions associées ;
- recréation propre d’une amitié supprimée.

### Partage défini uniquement par ami

- mode Aucun ;
- mode Résumé ;
- mode Personnalisé ;
- sélection indépendante des champs communs, cardio et musculation ;
- absence de réglage global concurrent ;
- absence de contrôle social pendant la saisie d’une activité.

### Fil et détail d’activité

- cartes spécialisées pour le cardio et la musculation ;
- filtrage serveur selon la relation et la permission courantes ;
- fiche détaillée sécurisée ;
- mise à jour après modification ;
- disparition après masquage, suppression ou révocation ;
- tri stable et déduplication ;
- aucune activité brute, note privée ou donnée non autorisée transmise.

### Résilience

- cache local conservé pendant les pannes temporaires ;
- reprise automatique de la publication après reconnexion ;
- outbox persistante ;
- protection contre les réponses obsolètes ;
- sérialisation des écritures locales ;
- isolation lors d’un changement de compte ;
- prise en charge de l’usage multi-appareil.

### Sécurité et confidentialité

- Bearer Dexie Cloud obligatoire sur toutes les API sociales ;
- sujet authentifié comparé aux identifiants demandés ;
- refus des mutations pour un tiers ;
- identifiants relationnels recalculés côté serveur ;
- validation et limitation des payloads ;
- noms publics assainis ;
- erreurs internes masquées ;
- `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` et politique de référent stricte.

## Versions techniques

- Application : `0.29.0`.
- AppDatabase locale : Dexie v10.
- Sauvegarde JSON : v9.
- Runtime Dexie Cloud prototype : v14.
- Contrat de snapshot : `0.29.0-a3`.
- Migrations D1 nécessaires : `0001` et `0002`, déjà appliquées avant A26.
- Migration D1 ou Dexie ajoutée par A26 : aucune.
- Tag attendu : `v0.29.0`.

## Validation

- audits sociaux A14 à A25 ;
- audit de sécurité A24 ;
- recette complète A25 avec deux comptes réels ;
- validation ordinateur et iPhone 15 sous iOS 26 ;
- contrôles anonymes `401 Unauthorized` ;
- lint, TypeScript, tests, build, audits de release et audit des dépendances.

## Hors périmètre

- annuaire public et suggestions ;
- likes et commentaires ;
- messagerie et groupes ;
- classements ;
- graphiques cardio sans série temporelle réelle ;
- export d’activité brute.
