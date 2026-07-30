# SportPilot 0.35.1 - reprise de session mobile

Branche : `fix/mobile-session-recovery-0.35.1`

Aucun tag ni déploiement n'est réalisé dans ce chantier.

SportPilot 0.35.1 corrige la perte apparente de session lors de la réouverture de la PWA et protège l'espace local associé au compte.

## Session et reprise mobile

- un jeton d'accès expiré mais renouvelable déclenche le renouvellement officiel avant de déclarer la session indisponible ;
- les appels concurrents partagent une seule tentative de renouvellement ;
- le retour au premier plan via `visibilitychange` et le retour du réseau peuvent relancer une tentative sans boucle permanente ;
- une panne réseau ou cloud laisse les données locales accessibles ;
- une expiration réelle propose une reconnexion ou la continuation hors ligne.

## Protection des données

- aucun état transitoire de connexion n'active automatiquement l'espace invité ;
- le fingerprint et la base locale du compte restent inchangés hors ligne ;
- aucune erreur de session n'appelle implicitement `logout()` ;
- le passage au mode invité est une action distincte et confirmée ;
- aucune donnée locale n'est supprimée, déplacée ou fusionnée par ce correctif.

## Identité sociale

- la préparation de l'identité sociale est limitée à la rubrique Amis ;
- le tableau de bord, la nutrition et la musculation restent accessibles pendant une reprise de session ;
- la rubrique Amis utilise les données locales lorsque le service distant est temporairement indisponible.

Le périmètre social reste inchangé : aucun annuaire public, likes, commentaires,
messagerie ou export d’activité brute n’est ajouté.

## Compatibilité

- application : `0.35.1` ;
- Dexie locale : v11, inchangée ;
- sauvegarde JSON : v10, inchangée ;
- runtime cloud : v16, inchangé ;
- aucune migration Dexie ou D1.
